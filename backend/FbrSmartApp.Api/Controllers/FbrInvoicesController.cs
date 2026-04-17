using System.Security.Claims;
using System.Text.Json;
using FbrSmartApp.Api.Auth;
using FbrSmartApp.Api.Data;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services;
using FbrSmartApp.Api.Services.Fbr;
using FbrSmartApp.Api.Services.RecordRules;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace FbrSmartApp.Api.Controllers;

[ApiController]
[Route("api/fbrInvoices")]
[Authorize]
public sealed class FbrInvoicesController : ControllerBase
{
    private const string ResourceKey = "fbrInvoices";

    private readonly AppDbContext _db;
    private readonly IFbrDigitalInvoicingClient _fbrClient;
    private readonly IFbrInvoiceExcelImportService _excelImport;
    private readonly RecordRulesService _recordRules;
    private readonly AppRecordMessageService _recordMessages;

    public FbrInvoicesController(
        AppDbContext db,
        IFbrDigitalInvoicingClient fbrClient,
        IFbrInvoiceExcelImportService excelImport,
        RecordRulesService recordRules,
        AppRecordMessageService recordMessages)
    {
        _db = db;
        _fbrClient = fbrClient;
        _excelImport = excelImport;
        _recordRules = recordRules;
        _recordMessages = recordMessages;
    }

    [HttpGet]
    [HasPermission("fbr.fbrInvoices.read")]
    public async Task<IActionResult> GetList(
        [FromQuery] string? sort,
        [FromQuery] string? range,
        [FromQuery] string? filter,
        CancellationToken ct
    )
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var query = _db.FbrInvoices.AsNoTracking().Where(x => x.CompanyId == companyId);
        query = await _recordRules.ApplyReadFilterAsync(query, user, "fbr", "fbrInvoices", ct);

        if (!string.IsNullOrWhiteSpace(filter))
        {
            try
            {
                using var doc = JsonDocument.Parse(filter);
                if (doc.RootElement.TryGetProperty("q", out var qEl))
                {
                    var q = qEl.GetString();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        var qTrim = q.Trim();
                        var partyIds = _db.Customers.AsNoTracking()
                            .Where(c =>
                                c.CompanyID == null || c.CompanyID == companyId)
                            .Where(c =>
                                (c.PartyBusinessName != null && c.PartyBusinessName.Contains(qTrim)) ||
                                (c.PartyName != null && c.PartyName.Contains(qTrim)) ||
                                (c.NTNNO != null && c.NTNNO.Contains(qTrim)) ||
                                (c.PhoneOne != null && c.PhoneOne.Contains(qTrim)) ||
                                (c.ContactPersonMobile != null &&
                                 c.ContactPersonMobile.Contains(qTrim)) ||
                                (c.AddressOne != null && c.AddressOne.Contains(qTrim)))
                            .Select(c => c.Id);
                        query = query.Where(x =>
                            (x.Reference != null && x.Reference.Contains(qTrim)) ||
                            (x.InvoiceNumber != null && x.InvoiceNumber.Contains(qTrim)) ||
                            partyIds.Contains(x.CustomerPartyId));
                    }
                }

                if (doc.RootElement.TryGetProperty("status", out var stEl))
                {
                    var st = stEl.GetString();
                    if (!string.IsNullOrWhiteSpace(st))
                        query = query.Where(x => x.Status == st);
                }
            }
            catch (JsonException)
            {
                // ignore bad filter
            }
        }

        query = query.OrderByDescending(x => x.InvoiceDate);

        var total = await query.CountAsync(ct);

        var from = 0;
        var to = Math.Min(24, Math.Max(total - 1, 0));
        if (!string.IsNullOrWhiteSpace(range))
        {
            try
            {
                var arr = JsonSerializer.Deserialize<int[]>(range);
                if (arr is { Length: >= 2 })
                {
                    from = Math.Max(0, arr[0]);
                    to = Math.Max(from, arr[1]);
                }
            }
            catch (JsonException)
            {
                // defaults
            }
        }

        var take = Math.Min(to - from + 1, 1000);
        var items = await query.Skip(from).Take(take).ToListAsync(ct);

        var customerIds = items.Select(x => x.CustomerPartyId).Distinct().ToList();
        // Resolve parties by id only: invoices already belong to this company; some DB rows use CompanyID 0/other vs claim.
        var customers = await _db.Customers.AsNoTracking()
            .Where(x => customerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, ct);

        var dtos = items
            .Select(x =>
            {
                customers.TryGetValue(x.CustomerPartyId, out var cust);
                return new FbrInvoiceListDto
                {
                    Id = x.Id,
                    Reference = x.Reference ?? "",
                    InvoiceNumber = x.InvoiceNumber ?? "",
                    CreatedAtUtc = x.CreatedAtUtc,
                    CustomerPartyId = x.CustomerPartyId,
                    CustomerName = cust != null
                        ? (cust.PartyBusinessName ?? cust.PartyName)
                        : null,
                    CustomerBusinessLogo = cust?.PartyBusinessLogo,
                    CustomerAddress = TrimOrNull(cust?.AddressOne),
                    CustomerNtn = ListDisplayCustomerNtn(cust),
                    CustomerPhone = ListDisplayCustomerPhone(cust),
                    InvoiceDate = x.InvoiceDate.ToString("yyyy-MM-dd"),
                    PaymentTerms = x.PaymentTerms,
                    Status = x.Status,
                    Total = x.Total,
                    Returned = x.Returned,
                    DeliveryFees = x.DeliveryFees,
                    TotalExTaxes = x.TotalExTaxes,
                    Taxes = x.Taxes,
                    FbrInvoiceNumber = x.FbrInvoiceNumber,
                    FbrScenarioId = x.FbrScenarioId,
                    ValidatedAtUtc = x.ValidatedAtUtc,
                    PostedAtUtc = x.PostedAtUtc,
                    IsLocked = x.IsLocked,
                };
            })
            .ToList();

        Response.Headers["Content-Range"] =
            $"fbrInvoices {from}-{from + Math.Max(dtos.Count - 1, 0)}/{total}";
        return Ok(dtos);
    }

    [HttpGet("import/template")]
    [HasPermission("fbr.fbrInvoices.read")]
    public IActionResult GetImportTemplate()
    {
        var bytes = _excelImport.BuildTemplateWorkbook();
        const string fileName = "FBR_Invoice_Import_Template.xlsx";
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    [HttpPost("import")]
    [HasPermission("fbr.fbrInvoices.create")]
    [RequestSizeLimit(20_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 20_000_000)]
    public async Task<ActionResult<FbrInvoiceImportResponseDto>> ImportExcel(
        IFormFile? file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var company = await _db.Companies.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null)
            return BadRequest(new { message = "Company not found." });

        await using var stream = file.OpenReadStream();
        var parsed = await _excelImport.ParseWorkbookAsync(companyId, company, stream, ct);
        if (!parsed.Success)
            return BadRequest(new { message = parsed.GlobalError ?? "Import parse failed." });

        var user = User.FindFirstValue("fullName") ?? User.Identity?.Name;
        var results = new List<FbrInvoiceImportRowResultDto>();
        var created = 0;
        var failed = 0;
        foreach (var g in parsed.Groups)
        {
            if (g.ParseError is not null)
            {
                failed++;
                results.Add(new FbrInvoiceImportRowResultDto
                {
                    GroupKey = g.GroupKey,
                    FirstExcelRow = g.FirstExcelRowNumber,
                    Error = g.ParseError,
                });
                continue;
            }

            if (g.Request is null)
            {
                failed++;
                results.Add(new FbrInvoiceImportRowResultDto
                {
                    GroupKey = g.GroupKey,
                    FirstExcelRow = g.FirstExcelRowNumber,
                    Error = "Internal error: missing request.",
                });
                continue;
            }

            var (dto, err) = await TryCreateInvoiceAsync(companyId, actingUser, user, g.Request, ct);
            if (err is not null)
            {
                failed++;
                results.Add(new FbrInvoiceImportRowResultDto
                {
                    GroupKey = g.GroupKey,
                    FirstExcelRow = g.FirstExcelRowNumber,
                    Reference = g.Request.Reference,
                    Error = err,
                });
            }
            else
            {
                created++;
                results.Add(new FbrInvoiceImportRowResultDto
                {
                    GroupKey = g.GroupKey,
                    FirstExcelRow = g.FirstExcelRowNumber,
                    Reference = dto!.Reference,
                    InvoiceId = dto.Id,
                    Error = null,
                });
            }
        }

        return Ok(new FbrInvoiceImportResponseDto
        {
            Created = created,
            Failed = failed,
            Results = results,
        });
    }

    /// <summary>
    /// Creates draft demo invoices for the current company: uses existing FBR scenarios (e.g. codes you maintain from a scenarios workbook)
    /// and product profiles that already have a PBR transaction type, plus an effective sales tax rate.
    /// </summary>
    [HttpPost("demo-data")]
    [HasPermission("fbr.fbrInvoices.create")]
    public async Task<ActionResult<FbrInvoiceDemoSeedResponseDto>> PostDemoData(CancellationToken ct)
    {
        const int count = 10;
        var companyId = GetCompanyIdOrThrow();
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();
        var displayName = User.FindFirstValue("fullName") ?? User.Identity?.Name;

        var companyExists = await _db.Companies.AsNoTracking()
            .AnyAsync(x => x.Id == companyId, ct);
        if (!companyExists)
            return BadRequest(new { message = "Company not found." });

        var scenarios = await _db.FbrScenarios.AsNoTracking()
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.ScenarioCode)
            .ToListAsync(ct);
        if (scenarios.Count == 0)
            return BadRequest(new { message = "Add at least one FBR scenario first (Masters → Scenarios), e.g. scenario codes from your SaveTech scenarios workbook." });

        var demoDateBase = DateTime.UtcNow.Date;
        var asOfToday = FbrSalesTaxRateExtensions.ToDateOnlyUtc(demoDateBase);
        var taxRates = await _db.FbrSalesTaxRates.AsNoTracking()
            .Where(x =>
                x.CompanyId == companyId &&
                x.IsActive &&
                x.EffectiveFrom <= asOfToday &&
                (x.EffectiveTo == null || x.EffectiveTo >= asOfToday))
            .ToListAsync(ct);
        if (taxRates.Count == 0)
        {
            var fallback = await _db.FbrSalesTaxRates.AsNoTracking()
                .Where(x => x.CompanyId == companyId && x.IsActive)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync(ct);
            if (fallback is null)
                return BadRequest(new { message = "No sales tax rates found. Add one under Catalog → Taxes." });
            taxRates = new List<FbrSalesTaxRate> { fallback };
            demoDateBase = DateTime.SpecifyKind(fallback.EffectiveFrom.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        }

        var products = await _db.ProductProfiles.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.FbrPdiTransTypeId != null && x.FbrPdiTransTypeId > 0)
            .OrderBy(x => x.ProductNo)
            .Take(80)
            .ToListAsync(ct);
        if (products.Count == 0)
            return BadRequest(new { message = "No product profiles with FBR transaction type (PDI). Set PDI on products or sync PDI masters." });

        var rnd = new Random();
        var customerNames = new[]
        {
            "Green Valley Foods",
            "Karachi Packaging Ltd",
            "Punjab Textile Mills",
            "Indus Chemicals",
            "Northern Logistics Co",
            "Summit Steel Traders",
            "Coastal Agro Supplies",
            "Metro Plastic Works",
            "Lahore Beverages",
            "Faisalabad Spinners",
            "Islamabad IT Supplies",
            "Multan Grain Merchants",
        };

        var response = new FbrInvoiceDemoSeedResponseDto();
        for (var i = 0; i < count; i++)
        {
            var scenario = scenarios[i % scenarios.Count];
            var product = products[(i * 11 + rnd.Next(products.Count)) % products.Count];
            var tax = taxRates[rnd.Next(taxRates.Count)];
            var invDate = demoDateBase.AddDays(-rnd.Next(0, 45));
            var asOfInv = FbrSalesTaxRateExtensions.ToDateOnlyUtc(invDate);
            if (!tax.IsEffectiveOn(asOfInv))
            {
                var alt = taxRates.FirstOrDefault(t => t.IsEffectiveOn(asOfInv));
                if (alt is not null)
                    tax = alt;
            }

            var buyerNtn = $"D{companyId}-{Guid.NewGuid():N}";
            if (buyerNtn.Length > 30)
                buyerNtn = buyerNtn[..30];

            var partyName = customerNames[i % customerNames.Length];
            var cust = new CustomerParty
            {
                CompanyID = companyId,
                PartyName = partyName.Length > 100 ? partyName[..100] : partyName,
                PartyBusinessName = $"{partyName} (Demo)",
                AddressOne = "Demo address",
                NTNNO = buyerNtn,
            };
            if (cust.PartyBusinessName.Length > 350)
                cust.PartyBusinessName = cust.PartyBusinessName[..350];

            _db.Customers.Add(cust);
            await _db.SaveChangesAsync(ct);

            var qty = (decimal)rnd.Next(1, 8);
            var unitPrice = rnd.Next(200, 8000);
            var req = new UpsertFbrInvoiceRequest
            {
                Reference = $"DEMO-{Guid.NewGuid():N}"[..24],
                CustomerPartyId = cust.Id,
                InvoiceDateUtc = invDate,
                PaymentTerms = "immediate",
                Status = "ordered",
                Returned = false,
                DeliveryFees = 0,
                FbrScenarioId = scenario.Id,
                Lines = new List<UpsertFbrInvoiceLineRequest>
                {
                    new()
                    {
                        ProductProfileId = product.Id,
                        Quantity = qty,
                        UnitPrice = unitPrice,
                        TaxRate = tax.Percentage,
                        FbrSalesTaxRateId = tax.Id,
                        DiscountRate = 0,
                        Remarks = $"Demo — {product.ProductName}",
                    },
                },
            };

            var (dto, err) = await TryCreateInvoiceAsync(companyId, actingUser, displayName, req, ct);
            if (err is not null)
                response.Errors.Add($"Invoice {i + 1}: {err}");
            else if (dto is not null)
            {
                response.Created++;
                response.InvoiceIds.Add(dto.Id);
            }
        }

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [HasPermission("fbr.fbrInvoices.read")]
    public async Task<ActionResult<FbrInvoiceDetailDto>> GetOne(Guid id, CancellationToken ct)
    {
        var user = await GetCurrentUserAsync(ct);
        if (user is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var inv = await _db.FbrInvoices.AsNoTracking()
            .Include(x => x.Lines)
            .Include(x => x.ChatterMessages)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (inv is null) return NotFound();

        if (!await _recordRules.SatisfiesReadAsync(inv, user, "fbr", "fbrInvoices", ct))
            return Forbid();

        return Ok(await MapDetailAsync(inv, companyId, ct));
    }

    [HttpPost]
    [HasPermission("fbr.fbrInvoices.create")]
    public async Task<ActionResult<FbrInvoiceDetailDto>> Create(
        [FromBody] UpsertFbrInvoiceRequest req,
        CancellationToken ct
    )
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var displayName = User.FindFirstValue("fullName") ?? User.Identity?.Name;
        var (dto, err) = await TryCreateInvoiceAsync(companyId, actingUser, displayName, req, ct);
        if (err is not null)
            return BadRequest(new { message = err });

        if (dto is not null)
        {
            await _recordMessages.AddSystemAsync(
                companyId,
                ResourceKey,
                dto.Id.ToString(),
                systemAction: "Created",
                authorUserId: actingUser.Id,
                authorDisplayName: actingUser.FullName,
                ct: ct,
                detailBody: $"Invoice created ({dto.InvoiceNumber})");
        }
        return Ok(dto);
    }

    /// <summary>Same persistence as <see cref="Create"/> — used by Excel import.</summary>
    private async Task<(FbrInvoiceDetailDto? Detail, string? Error)> TryCreateInvoiceAsync(
        int companyId,
        User? actingUser,
        string? userDisplayName,
        UpsertFbrInvoiceRequest req,
        CancellationToken ct)
    {
        if (req.StrictImportDuplicateCheck &&
            req.ExcelUniqueInvoiceId is int strictUid &&
            strictUid != 0 &&
            await _db.FbrInvoices.AnyAsync(x => x.CompanyId == companyId && x.ExcelUniqueInvoiceId == strictUid, ct))
        {
            return (null, $"This invoice was already imported (Excel UniqueInvoiceID {strictUid}).");
        }

        var seq = await NextInvoiceNumberAsync(companyId, ct);
        var invoiceNumber = $"INV{seq:00000}";
        string? reference = string.IsNullOrWhiteSpace(req.Reference) ? null : req.Reference.Trim();
        if (!string.IsNullOrEmpty(reference))
        {
            var refTaken = await _db.FbrInvoices.AnyAsync(
                x => x.CompanyId == companyId && x.Reference == reference,
                ct);
            if (refTaken)
            {
                if (req.StrictImportDuplicateCheck)
                    return (null, $"Reference \"{reference}\" is already used on another invoice.");
                return (null, $"Reference \"{reference}\" is already used. Choose a different reference.");
            }
        }

        var hasProductLines = (req.Lines ?? []).Any(l => l.ProductProfileId != Guid.Empty);
        if (hasProductLines && (req.FbrScenarioId is null or <= 0))
            return (null, "FBR scenario is required when the invoice has lines.");
        if (req.FbrScenarioId is int sid && sid > 0)
        {
            var scenOk = await _db.FbrScenarios.AsNoTracking()
                .AnyAsync(x => x.Id == sid && x.CompanyId == companyId, ct);
            if (!scenOk)
                return (null, "Invalid FBR scenario for this company.");
        }

        var entity = new FbrInvoice
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Reference = reference,
            InvoiceNumber = invoiceNumber,
            CustomerPartyId = req.CustomerPartyId,
            InvoiceDate = ResolveInvoiceDateOnlyOrDefault(req.InvoiceDate, req.InvoiceDateUtc),
            InvoiceDateUtc = req.InvoiceDateUtc ?? DateTime.UtcNow,
            PaymentTerms = string.IsNullOrWhiteSpace(req.PaymentTerms) ? "immediate" : req.PaymentTerms!,
            Status = SanitizeNewInvoiceStatus(req.Status),
            Returned = req.Returned,
            DeliveryFees = req.DeliveryFees,
            FbrScenarioId = req.FbrScenarioId,
            ExcelUniqueInvoiceId =
                req.ExcelUniqueInvoiceId is int ex and not 0 ? ex : null,
            CreatedByDisplayName = userDisplayName,
            UpdatedByDisplayName = userDisplayName,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
        };

        var lineErr = await ApplyLinesAsync(entity, req.Lines ?? [], companyId, ct);
        if (lineErr != null)
            return (null, lineErr);
        RecalcTotals(entity);

        if (actingUser is not null &&
            !await _recordRules.SatisfiesCreateAsync(entity, actingUser, "fbr", "fbrInvoices", ct))
            return (null, "You are not allowed to create this invoice under the current record rules.");

        _db.FbrInvoices.Add(entity);
        await _db.SaveChangesAsync(ct);

        var reloaded = await _db.FbrInvoices.AsNoTracking()
            .Include(x => x.Lines)
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == entity.Id, ct);
        var dto = await MapDetailAsync(reloaded, companyId, ct);
        return (dto, null);
    }

    private async Task<int> NextInvoiceNumberAsync(int companyId, CancellationToken ct)
    {
        // Use EF's connection; some environments return an uninitialized DbConnection instance
        // (ConnectionString empty) until we explicitly set/open it.
        var conn = _db.Database.GetDbConnection();
        if (string.IsNullOrWhiteSpace(conn.ConnectionString))
        {
            var cs = _db.Database.GetConnectionString();
            if (!string.IsNullOrWhiteSpace(cs)) conn.ConnectionString = cs;
        }
        if (conn.State != System.Data.ConnectionState.Open) await _db.Database.OpenConnectionAsync(ct);

        await using var tx = await conn.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);

        // Lock the row for this company (or range) so concurrent users never get the same number.
        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText =
                """
                SELECT NextValue
                FROM dbo.FbrInvoiceNumberSequences WITH (UPDLOCK, HOLDLOCK)
                WHERE CompanyId = @CompanyId
                """;
            var p = cmd.CreateParameter();
            p.ParameterName = "@CompanyId";
            p.Value = companyId;
            cmd.Parameters.Add(p);

            var existing = await cmd.ExecuteScalarAsync(ct);
            if (existing == null || existing == DBNull.Value)
            {
                // First invoice for this company (or sequence row missing).
                // Seed from the current max INV##### in FbrInvoices to avoid duplicate numbers on existing DBs.
                var startAt = 1;
                await using (var maxCmd = conn.CreateCommand())
                {
                    maxCmd.Transaction = tx;
                    maxCmd.CommandText =
                        """
                        SELECT MAX(TRY_CONVERT(INT, SUBSTRING(InvoiceNumber, 4, 20)))
                        FROM dbo.FbrInvoices WITH (HOLDLOCK)
                        WHERE CompanyId = @CompanyId
                          AND InvoiceNumber IS NOT NULL
                          AND LEFT(InvoiceNumber, 3) = 'INV'
                        """;
                    var mp = maxCmd.CreateParameter();
                    mp.ParameterName = "@CompanyId";
                    mp.Value = companyId;
                    maxCmd.Parameters.Add(mp);
                    var maxObj = await maxCmd.ExecuteScalarAsync(ct);
                    if (maxObj != null && maxObj != DBNull.Value)
                    {
                        var max = Convert.ToInt32(maxObj);
                        if (max >= 1) startAt = max + 1;
                    }
                }

                await using var ins = conn.CreateCommand();
                ins.Transaction = tx;
                ins.CommandText =
                    """
                    INSERT INTO dbo.FbrInvoiceNumberSequences(CompanyId, NextValue)
                    VALUES (@CompanyId, @NextValue)
                    """;
                var p1 = ins.CreateParameter();
                p1.ParameterName = "@CompanyId";
                p1.Value = companyId;
                var p2 = ins.CreateParameter();
                p2.ParameterName = "@NextValue";
                p2.Value = startAt + 1; // store next after returning startAt
                ins.Parameters.Add(p1);
                ins.Parameters.Add(p2);
                await ins.ExecuteNonQueryAsync(ct);

                await tx.CommitAsync(ct);
                return startAt;
            }

            var current = Convert.ToInt32(existing);

            await using var upd = conn.CreateCommand();
            upd.Transaction = tx;
            upd.CommandText =
                """
                UPDATE dbo.FbrInvoiceNumberSequences
                SET NextValue = NextValue + 1
                WHERE CompanyId = @CompanyId
                """;
            var pu = upd.CreateParameter();
            pu.ParameterName = "@CompanyId";
            pu.Value = companyId;
            upd.Parameters.Add(pu);
            await upd.ExecuteNonQueryAsync(ct);

            await tx.CommitAsync(ct);
            return current;
        }
    }

    [HttpPut("{id:guid}")]
    [HasPermission("fbr.fbrInvoices.write")]
    public async Task<ActionResult<FbrInvoiceDetailDto>> Update(
        Guid id,
        [FromBody] UpsertFbrInvoiceRequest req,
        CancellationToken ct
    )
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var writeEntity = await _db.FbrInvoices.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (writeEntity is null) return NotFound();
        if (writeEntity.IsLocked)
            return Conflict(new { message = "This invoice is posted to FBR and cannot be edited." });

        if (!await _recordRules.SatisfiesWriteAsync(writeEntity, actingUser, "fbr", "fbrInvoices", ct))
            return Forbid();

        var invoiceDateUtc = req.InvoiceDateUtc ?? await _db.FbrInvoices.AsNoTracking()
            .Where(x => x.Id == id && x.CompanyId == companyId)
            .Select(x => x.InvoiceDateUtc)
            .FirstAsync(ct);
        var invoiceDateOnly = ResolveInvoiceDateOnlyOrDefault(req.InvoiceDate, invoiceDateUtc);

        var hasProductLines = (req.Lines ?? []).Any(l => l.ProductProfileId != Guid.Empty);
        if (hasProductLines && (req.FbrScenarioId is null or <= 0))
            return BadRequest(new { message = "FBR scenario is required when the invoice has lines." });
        if (req.FbrScenarioId is int sid && sid > 0)
        {
            var scenOk = await _db.FbrScenarios.AsNoTracking()
                .AnyAsync(x => x.Id == sid && x.CompanyId == companyId, ct);
            if (!scenOk)
                return BadRequest(new { message = "Invalid FBR scenario for this company." });
        }

        var (newLines, lineErr) = await BuildLinesAsync(id, req.Lines ?? [], companyId, invoiceDateUtc, ct);
        if (lineErr != null)
            return BadRequest(new { message = lineErr });
        var (totalEx, taxes, total, taxRate) = ComputeTotals(newLines, req.DeliveryFees);

        var newRef = string.IsNullOrWhiteSpace(req.Reference) ? null : req.Reference.Trim();
        var currentRef = await _db.FbrInvoices.AsNoTracking()
            .Where(x => x.Id == id && x.CompanyId == companyId)
            .Select(x => x.Reference)
            .FirstOrDefaultAsync(ct);
        if (newRef != currentRef)
        {
            if (newRef != null &&
                await _db.FbrInvoices.AnyAsync(
                    x => x.CompanyId == companyId && x.Reference == newRef && x.Id != id,
                    ct))
            {
                return BadRequest(new { message = $"Reference \"{newRef}\" is already used on another invoice." });
            }
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        // Update header + totals in one statement (no EF concurrency rowcount checks).
        var updater = User.FindFirstValue("fullName") ?? User.Identity?.Name;
        var nextStatus = SanitizeInvoiceStatusOnUpdate(writeEntity.Status, req.Status);
        await _db.FbrInvoices
            .Where(x => x.Id == id && x.CompanyId == companyId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(x => x.CustomerPartyId, req.CustomerPartyId)
                    .SetProperty(x => x.InvoiceDate, invoiceDateOnly)
                    .SetProperty(x => x.InvoiceDateUtc, e => req.InvoiceDateUtc ?? e.InvoiceDateUtc)
                    .SetProperty(x => x.PaymentTerms, e => string.IsNullOrWhiteSpace(req.PaymentTerms) ? e.PaymentTerms : req.PaymentTerms!)
                    .SetProperty(x => x.Status, nextStatus)
                    .SetProperty(x => x.Returned, req.Returned)
                    .SetProperty(x => x.DeliveryFees, req.DeliveryFees)
                    .SetProperty(x => x.FbrScenarioId, req.FbrScenarioId)
                    .SetProperty(x => x.Reference, _ => newRef)
                    .SetProperty(x => x.TotalExTaxes, totalEx)
                    .SetProperty(x => x.Taxes, taxes)
                    .SetProperty(x => x.Total, total)
                    .SetProperty(x => x.TaxRate, taxRate)
                    .SetProperty(x => x.UpdatedByDisplayName, updater)
                    .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow),
                ct
            );

        // Replace lines atomically.
        await _db.FbrInvoiceLines.Where(x => x.InvoiceId == id).ExecuteDeleteAsync(ct);
        if (newLines.Count > 0) _db.FbrInvoiceLines.AddRange(newLines);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var reloaded = await _db.FbrInvoices.AsNoTracking()
            .Include(x => x.Lines)
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == id, ct);
        var dto = await MapDetailAsync(reloaded, companyId, ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(),
            systemAction: "Updated",
            authorUserId: actingUser.Id,
            authorDisplayName: actingUser.FullName,
            ct: ct,
            detailBody: $"Invoice updated ({dto.InvoiceNumber})");

        return Ok(dto);
    }

    private static (decimal TotalEx, decimal Taxes, decimal Total, decimal TaxRate) ComputeTotals(
        IReadOnlyList<FbrInvoiceLine> lines,
        decimal deliveryFees
    )
    {
        decimal ex = 0, tx = 0;
        foreach (var line in lines)
        {
            var grossLine = line.Quantity * line.UnitPrice;
            var disc = line.DiscountRate < 0 ? 0 : (line.DiscountRate > 100 ? 100 : line.DiscountRate);
            var net = grossLine * (1 - (disc / 100m));
            ex += net;
            var mrpGross = line.FixedNotifiedApplicable ? (line.Quantity * line.MrpRateValue) : 0m;
            var taxBase = line.FixedNotifiedApplicable && line.MrpRateValue > 0 ? mrpGross : net;
            tx += taxBase * line.TaxRate;
        }
        var total = ex + tx + deliveryFees;
        var taxRate = ex > 0 ? tx / ex : 0;
        return (ex, tx, total, taxRate);
    }

    private async Task<(List<FbrInvoiceLine> Lines, string? Error)> BuildLinesAsync(
        Guid invoiceId,
        IReadOnlyList<UpsertFbrInvoiceLineRequest> lineReqs,
        int companyId,
        DateTime invoiceDateUtc,
        CancellationToken ct
    )
    {
        var asOf = FbrSalesTaxRateExtensions.ToDateOnlyUtc(invoiceDateUtc);
        var profileIds = lineReqs.Select(x => x.ProductProfileId).Distinct().Where(x => x != Guid.Empty).ToList();
        var profiles = await _db.ProductProfiles.AsNoTracking()
            .Where(x => profileIds.Contains(x.Id) && x.CompanyId == companyId)
            .Select(x => new
            {
                x.Id,
                x.HsCode,
                x.SroItemId,
                x.SroScheduleNoText,
                x.SroItemRefText,
                x.FixedNotifiedApplicable,
                x.MrpRateValue,
            })
            .ToDictionaryAsync(x => x.Id, ct);

        var sroItemIds = profiles.Values.Select(x => x.SroItemId ?? 0).Where(x => x > 0).Distinct().ToList();
        var sroItems = await _db.FbrSroItems.AsNoTracking()
            .Where(x => sroItemIds.Contains(x.Id))
            .Select(x => new { x.Id, x.SroId, x.SroItemDesc })
            .ToListAsync(ct);

        var schIds = sroItems.Select(x => x.SroId).Distinct().ToList();
        var schedules = await _db.FbrSroSchedules.AsNoTracking()
            .Where(x => schIds.Contains(x.Id))
            .Select(x => new { x.Id, x.SerNo })
            .ToDictionaryAsync(x => x.Id, x => x.SerNo, ct);

        var sroTexts = new Dictionary<int, string>();
        foreach (var it in sroItems)
        {
            schedules.TryGetValue(it.SroId, out var ser);
            var parts = new[] { ser, it.SroItemDesc }.Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
            sroTexts[it.Id] = parts.Length == 0 ? "" : string.Join(" / ", parts);
        }

        var taxIds = lineReqs
            .Where(x => x.ProductProfileId != Guid.Empty)
            .SelectMany(lr =>
            {
                if (lr.FbrSalesTaxRateIds is { Count: > 0 })
                    return lr.FbrSalesTaxRateIds.Where(t => t > 0);
                if (lr.FbrSalesTaxRateId is int oid && oid > 0)
                    return new[] { oid }.AsEnumerable();
                return Enumerable.Empty<int>();
            })
            .Distinct()
            .ToList();
        var taxRows = await FbrSalesTaxRateQueries.GetByIdsAsync(_db, companyId, taxIds, ct);

        var lines = new List<FbrInvoiceLine>(lineReqs.Count);
        var order = 0;
        foreach (var lr in lineReqs)
        {
            if (lr.ProductProfileId == Guid.Empty) continue;

            var requestedIds = (lr.FbrSalesTaxRateIds is { Count: > 0 }
                    ? lr.FbrSalesTaxRateIds.Where(t => t > 0).Distinct().ToList()
                    : lr.FbrSalesTaxRateId is int oldId && oldId > 0
                        ? new List<int> { oldId }
                        : new List<int>());

            decimal sumPct = 0m;
            int? primaryId = null;
            string? idsJson = null;

            if (requestedIds.Count > 0)
            {
                foreach (var tid in requestedIds)
                {
                    if (!taxRows.TryGetValue(tid, out var tr))
                        return ([], "Invalid sales tax rate for this company.");
                    if (!tr.IsEffectiveOn(asOf))
                        return ([], $"Sales tax rate \"{tr.Label}\" is not effective on the invoice date.");
                    sumPct += tr.Percentage;
                }

                primaryId = requestedIds[0];
                idsJson = requestedIds.Count > 1 ? JsonSerializer.Serialize(requestedIds) : null;
            }

            profiles.TryGetValue(lr.ProductProfileId, out var prof);
            var hsCode = prof?.HsCode ?? "";
            var sroText = "";
            var schedT = prof?.SroScheduleNoText?.Trim();
            var itemT = prof?.SroItemRefText?.Trim();
            if (!string.IsNullOrEmpty(schedT) || !string.IsNullOrEmpty(itemT))
            {
                sroText = string.Join(
                    " / ",
                    new[] { schedT, itemT }.Where(s => !string.IsNullOrEmpty(s)));
            }
            else if (prof?.SroItemId is int sid && sid > 0)
                sroTexts.TryGetValue(sid, out sroText);

            lines.Add(new FbrInvoiceLine
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoiceId,
                SortOrder = order++,
                ProductProfileId = lr.ProductProfileId,
                Quantity = lr.Quantity <= 0 ? 1 : lr.Quantity,
                UnitPrice = lr.UnitPrice,
                TaxRate = sumPct,
                FbrSalesTaxRateId = primaryId,
                FbrSalesTaxRateIdsJson = idsJson,
                DiscountRate = lr.DiscountRate,
                FixedNotifiedApplicable = lr.FixedNotifiedApplicable,
                MrpRateValue = lr.FixedNotifiedApplicable ? lr.MrpRateValue : 0m,
                HsCode = hsCode ?? "",
                SroItemText = sroText ?? "",
                Remarks = lr.Remarks ?? "",
            });
        }

        return (lines, null);
    }

    [HttpDelete("{id:guid}")]
    [HasPermission("fbr.fbrInvoices.delete")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var entity = await _db.FbrInvoices.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (entity is null) return NotFound();
        if (entity.IsLocked)
            return Conflict(new { message = "This invoice is posted to FBR and cannot be deleted." });

        if (!await _recordRules.SatisfiesDeleteAsync(entity, actingUser, "fbr", "fbrInvoices", ct))
            return Forbid();

        _db.FbrInvoices.Remove(entity);
        await _db.SaveChangesAsync(ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(),
            systemAction: "Deleted",
            authorUserId: actingUser.Id,
            authorDisplayName: actingUser.FullName,
            ct: ct,
            detailBody: $"Invoice deleted ({entity.InvoiceNumber ?? "—"})");
        return Ok(new { id });
    }

    [HttpPost("{id:guid}/validate")]
    [HasPermission("fbr.fbrInvoices.write")]
    public async Task<ActionResult<FbrInvoiceDetailDto>> ValidateWithFbr(Guid id, CancellationToken ct)
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var inv = await _db.FbrInvoices
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (inv is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(inv, actingUser, "fbr", "fbrInvoices", ct))
            return Forbid();

        if (inv.IsLocked)
            return Conflict(new { message = "Invoice is locked." });
        if (!string.Equals(inv.Status, "ordered", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only draft invoices (ordered) can be validated." });
        if (inv.Lines.Count == 0)
            return BadRequest(new { message = "Invoice must have at least one line." });

        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null) return BadRequest(new { message = "Company not found." });

        var fbrPre = await ValidateFbrInvoicePayloadPrereqsAsync(inv, companyId, ct);
        if (fbrPre != null)
            return BadRequest(new { message = fbrPre });

        var (token, useSandbox) = ResolveFbrToken(company);
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "FBR token is not configured for this environment." });

        var payload = await BuildFbrPayloadAsync(inv, company, companyId, ct);
        var response = await _fbrClient.ValidateAsync(payload, token, useSandbox, ct);
        var responseJson = TruncateForDb(JsonSerializer.Serialize(response, FbrJsonSerializerOptions.ForStoredSnapshot));

        if (!IsFbrSuccess(response))
        {
            var err = FormatFbrErrors(response);
            var errDb = TruncateErr(err, 2000);
            await _db.FbrInvoices.Where(x => x.Id == id && x.CompanyId == companyId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.FbrLastResponseJson, responseJson)
                    .SetProperty(x => x.FbrLastError, errDb)
                    .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), ct);
            return BadRequest(new { message = err, fbr = response });
        }

        var newFbrNo = string.IsNullOrWhiteSpace(response.InvoiceNumber)
            ? inv.FbrInvoiceNumber
            : response.InvoiceNumber.Trim();
        var updater = User.FindFirstValue("fullName") ?? User.Identity?.Name;
        await _db.FbrInvoices.Where(x => x.Id == id && x.CompanyId == companyId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Status, "delivered")
                .SetProperty(x => x.ValidatedAtUtc, DateTime.UtcNow)
                .SetProperty(x => x.FbrLastResponseJson, responseJson)
                .SetProperty(x => x.FbrLastError, (string?)null)
                .SetProperty(x => x.FbrInvoiceNumber, newFbrNo)
                .SetProperty(x => x.UpdatedByDisplayName, updater)
                .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), ct);

        var reloaded = await _db.FbrInvoices.AsNoTracking()
            .Include(x => x.Lines)
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == id, ct);
        var dto = await MapDetailAsync(reloaded, companyId, ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(),
            systemAction: "Validated",
            authorUserId: actingUser.Id,
            authorDisplayName: actingUser.FullName,
            ct: ct,
            detailBody: $"Invoice validated with FBR ({dto.InvoiceNumber})");

        return Ok(dto);
    }

    [HttpPost("{id:guid}/post")]
    [HasPermission("fbr.fbrInvoices.write")]
    public async Task<ActionResult<FbrInvoiceDetailDto>> PostToFbr(Guid id, CancellationToken ct)
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var inv = await _db.FbrInvoices
            .Include(x => x.Lines)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (inv is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(inv, actingUser, "fbr", "fbrInvoices", ct))
            return Forbid();

        if (inv.IsLocked)
            return Conflict(new { message = "Invoice is already posted and locked." });
        if (!string.Equals(inv.Status, "delivered", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Validate the invoice before pushing to FBR." });
        if (inv.Lines.Count == 0)
            return BadRequest(new { message = "Invoice must have at least one line." });

        var company = await _db.Companies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == companyId, ct);
        if (company is null) return BadRequest(new { message = "Company not found." });

        var fbrPre = await ValidateFbrInvoicePayloadPrereqsAsync(inv, companyId, ct);
        if (fbrPre != null)
            return BadRequest(new { message = fbrPre });

        var (token, useSandbox) = ResolveFbrToken(company);
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "FBR token is not configured for this environment." });

        var payload = await BuildFbrPayloadAsync(inv, company, companyId, ct);
        var response = await _fbrClient.PostAsync(payload, token, useSandbox, ct);
        var responseJson = TruncateForDb(JsonSerializer.Serialize(response, FbrJsonSerializerOptions.ForStoredSnapshot));

        if (!IsFbrSuccess(response))
        {
            var err = FormatFbrErrors(response);
            var errDb = TruncateErr(err, 2000);
            await _db.FbrInvoices.Where(x => x.Id == id && x.CompanyId == companyId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.FbrLastResponseJson, responseJson)
                    .SetProperty(x => x.FbrLastError, errDb)
                    .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), ct);
            return BadRequest(new { message = err, fbr = response });
        }

        var fbrNo = string.IsNullOrWhiteSpace(response.InvoiceNumber)
            ? inv.FbrInvoiceNumber
            : response.InvoiceNumber.Trim();
        if (string.IsNullOrWhiteSpace(fbrNo))
            return BadRequest(new { message = "FBR did not return an invoice number.", fbr = response });

        var updater = User.FindFirstValue("fullName") ?? User.Identity?.Name;
        await _db.FbrInvoices.Where(x => x.Id == id && x.CompanyId == companyId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Status, "posted")
                .SetProperty(x => x.PostedAtUtc, DateTime.UtcNow)
                .SetProperty(x => x.IsLocked, true)
                .SetProperty(x => x.FbrInvoiceNumber, fbrNo)
                .SetProperty(x => x.FbrLastResponseJson, responseJson)
                .SetProperty(x => x.FbrLastError, (string?)null)
                .SetProperty(x => x.UpdatedByDisplayName, updater)
                .SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), ct);

        var reloaded = await _db.FbrInvoices.AsNoTracking()
            .Include(x => x.Lines)
            .Include(x => x.ChatterMessages)
            .FirstAsync(x => x.Id == id, ct);
        var dto = await MapDetailAsync(reloaded, companyId, ct);

        await _recordMessages.AddSystemAsync(
            companyId,
            ResourceKey,
            id.ToString(),
            systemAction: "Posted",
            authorUserId: actingUser.Id,
            authorDisplayName: actingUser.FullName,
            ct: ct,
            detailBody: $"Invoice posted to FBR ({dto.InvoiceNumber})");

        return Ok(dto);
    }

    /// <summary>Append chatter message + optional file payloads (base64).</summary>
    [HttpPost("{id:guid}/chatter")]
    [HasPermission("fbr.fbrInvoices.write")]
    public async Task<ActionResult<ChatterMessageDto>> PostChatter(
        Guid id,
        [FromBody] PostChatterRequest req,
        CancellationToken ct
    )
    {
        var actingUser = await GetCurrentUserAsync(ct);
        if (actingUser is null) return Unauthorized();

        var companyId = GetCompanyIdOrThrow();
        var inv = await _db.FbrInvoices.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, ct);
        if (inv is null) return NotFound();

        if (!await _recordRules.SatisfiesWriteAsync(inv, actingUser, "fbr", "fbrInvoices", ct))
            return Forbid();

        var author = User.FindFirstValue("fullName") ?? User.Identity?.Name ?? "User";
        string? attachmentsJson = null;
        if (req.Attachments is { Count: > 0 })
        {
            var list = new List<object>();
            foreach (var a in req.Attachments)
            {
                if (string.IsNullOrWhiteSpace(a.DataBase64)) continue;
                var raw = a.DataBase64;
                if (raw.Length > 600_000) continue;
                list.Add(new { name = a.Name ?? "file", mime = a.Mime ?? "application/octet-stream", dataBase64 = raw });
            }

            attachmentsJson = JsonSerializer.Serialize(list);
        }

        var msg = new FbrInvoiceChatterMessage
        {
            Id = Guid.NewGuid(),
            InvoiceId = id,
            Body = req.Body?.Trim() ?? "",
            CreatedAtUtc = DateTime.UtcNow,
            AuthorDisplayName = author,
            AttachmentsJson = attachmentsJson,
        };
        _db.FbrInvoiceChatterMessages.Add(msg);
        await _db.SaveChangesAsync(ct);

        return Ok(MapChatter(msg));
    }

    private async Task<string?> ApplyLinesAsync(
        FbrInvoice invoice,
        IReadOnlyList<UpsertFbrInvoiceLineRequest> lineReqs,
        int companyId,
        CancellationToken ct
    )
    {
        var (lines, err) = await BuildLinesAsync(invoice.Id, lineReqs, companyId, invoice.InvoiceDateUtc, ct);
        if (err != null)
            return err;
        foreach (var line in lines)
            invoice.Lines.Add(line);
        return null;
    }

    private static void RecalcTotals(FbrInvoice invoice)
    {
        decimal ex = 0, tx = 0;
        foreach (var line in invoice.Lines)
        {
            var grossLine = line.Quantity * line.UnitPrice;
            var disc = line.DiscountRate < 0 ? 0 : (line.DiscountRate > 100 ? 100 : line.DiscountRate);
            var net = grossLine * (1 - (disc / 100m));
            ex += net;
            var mrpGross = line.FixedNotifiedApplicable ? (line.Quantity * line.MrpRateValue) : 0m;
            var taxBase = line.FixedNotifiedApplicable && line.MrpRateValue > 0 ? mrpGross : net;
            tx += taxBase * line.TaxRate;
        }

        invoice.TotalExTaxes = ex;
        invoice.Taxes = tx;
        invoice.Total = ex + tx + invoice.DeliveryFees;
        invoice.TaxRate = ex > 0 ? tx / ex : 0;
    }

    private async Task<FbrInvoiceDetailDto> MapDetailAsync(FbrInvoice inv, int companyId, CancellationToken ct)
    {
        var profileIds = inv.Lines.Select(x => x.ProductProfileId).Distinct().ToList();
        var profiles = await _db.ProductProfiles.AsNoTracking()
            .Where(x => profileIds.Contains(x.Id) && x.CompanyId == companyId)
            .ToDictionaryAsync(x => x.Id, ct);

        var pdiTypeIds = profiles.Values
            .Select(x => x.FbrPdiTransTypeId)
            .Where(x => x is int v && v > 0)
            .Cast<int>()
            .Distinct()
            .ToList();
        var pdiTypeDesc = pdiTypeIds.Count == 0
            ? new Dictionary<int, string>()
            : await _db.FbrPdiTransTypes.AsNoTracking()
                .Where(x => x.CompanyId == companyId && pdiTypeIds.Contains(x.TransTypeId))
                .ToDictionaryAsync(x => x.TransTypeId, x => x.Description, ct);

        var lineDtos = new List<FbrInvoiceLineDto>();
        foreach (var line in inv.Lines.OrderBy(x => x.SortOrder))
        {
            profiles.TryGetValue(line.ProductProfileId, out var prof);
            var taxIdList = FbrInvoiceLineTaxIds.Parse(line);
            var ttId = prof?.FbrPdiTransTypeId;
            var saleTypeText = ttId is int tid && tid > 0 && pdiTypeDesc.TryGetValue(tid, out var d) ? d : "";
            lineDtos.Add(new FbrInvoiceLineDto
            {
                Id = line.Id,
                ProductProfileId = line.ProductProfileId,
                ProductNo = prof?.ProductNo,
                ProductName = prof?.ProductName,
                Quantity = line.Quantity,
                UnitPrice = line.UnitPrice,
                TaxRate = line.TaxRate,
                FbrSalesTaxRateId = line.FbrSalesTaxRateId,
                FbrSalesTaxRateIds = taxIdList.Count > 0 ? taxIdList.ToList() : null,
                DiscountRate = line.DiscountRate,
                FixedNotifiedApplicable = line.FixedNotifiedApplicable,
                MrpRateValue = line.MrpRateValue,
                HsCode = prof?.HsCode ?? line.HsCode,
                SroItemText = await LiveSroTextAsync(prof, line.SroItemText, ct),
                SroScheduleNoText = prof?.SroScheduleNoText ?? "",
                SroItemRefText = prof?.SroItemRefText ?? "",
                FbrSaleTypeText = saleTypeText,
                Remarks = line.Remarks,
            });
        }

        var chatter = (inv.ChatterMessages ?? Array.Empty<FbrInvoiceChatterMessage>())
            .OrderBy(x => x.CreatedAtUtc)
            .Select(MapChatter)
            .ToList();

        return new FbrInvoiceDetailDto
        {
            Id = inv.Id,
            Reference = inv.Reference ?? "",
            InvoiceNumber = inv.InvoiceNumber ?? "",
            CreatedAtUtc = inv.CreatedAtUtc,
            UpdatedAtUtc = inv.UpdatedAtUtc,
            CreatedByDisplayName = inv.CreatedByDisplayName,
            UpdatedByDisplayName = inv.UpdatedByDisplayName,
            CustomerPartyId = inv.CustomerPartyId,
            InvoiceDate = inv.InvoiceDate.ToString("yyyy-MM-dd"),
            PaymentTerms = inv.PaymentTerms,
            Status = inv.Status,
            FbrInvoiceNumber = inv.FbrInvoiceNumber,
            IsLocked = inv.IsLocked,
            ValidatedAtUtc = inv.ValidatedAtUtc,
            PostedAtUtc = inv.PostedAtUtc,
            FbrLastError = inv.FbrLastError,
            FbrLastResponseJson = inv.FbrLastResponseJson,
            Returned = inv.Returned,
            DeliveryFees = inv.DeliveryFees,
            TotalExTaxes = inv.TotalExTaxes,
            Taxes = inv.Taxes,
            Total = inv.Total,
            TaxRate = inv.TaxRate,
            FbrScenarioId = inv.FbrScenarioId,
            Lines = lineDtos,
            ChatterMessages = chatter,
        };
    }

    private static Task<string> LiveSroTextAsync(ProductProfile? prof, string snapshot, CancellationToken ct)
    {
        _ = prof;
        _ = ct;
        return Task.FromResult(snapshot);
    }

    private static ChatterMessageDto MapChatter(FbrInvoiceChatterMessage m)
    {
        List<ChatterAttachmentDto>? attachments = null;
        if (!string.IsNullOrWhiteSpace(m.AttachmentsJson))
        {
            try
            {
                attachments = JsonSerializer.Deserialize<List<ChatterAttachmentDto>>(
                    m.AttachmentsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException)
            {
                attachments = null;
            }
        }

        return new ChatterMessageDto
        {
            Id = m.Id,
            Body = m.Body,
            CreatedAt = m.CreatedAtUtc.ToString("O"),
            AuthorDisplayName = m.AuthorDisplayName,
            Attachments = attachments,
        };
    }

    private async Task<string?> ValidateFbrInvoicePayloadPrereqsAsync(
        FbrInvoice inv,
        int companyId,
        CancellationToken ct)
    {
        if (inv.FbrScenarioId is null or <= 0)
            return "Select an FBR scenario before validating or posting.";
        var scenExists = await _db.FbrScenarios.AsNoTracking()
            .AnyAsync(x => x.Id == inv.FbrScenarioId && x.CompanyId == companyId, ct);
        if (!scenExists)
            return "Invalid FBR scenario.";

        var asOf = FbrSalesTaxRateExtensions.ToDateOnlyUtc(inv.InvoiceDateUtc);
        var profileIds = inv.Lines.Select(x => x.ProductProfileId).Distinct().ToList();
        var profiles = await _db.ProductProfiles.AsNoTracking()
            .Where(x => profileIds.Contains(x.Id) && x.CompanyId == companyId)
            .ToDictionaryAsync(x => x.Id, ct);

        var taxIds = inv.Lines
            .SelectMany(l => FbrInvoiceLineTaxIds.Parse(l))
            .Where(x => x > 0)
            .Distinct()
            .ToList();
        var taxRows = await FbrSalesTaxRateQueries.GetByIdsAsync(_db, companyId, taxIds, ct);

        foreach (var line in inv.Lines)
        {
            if (!profiles.TryGetValue(line.ProductProfileId, out var prof))
                return "Product profile not found for a line.";
            if (prof.FbrPdiTransTypeId is null or <= 0)
                return $"Product \"{prof.ProductName}\" is missing FBR transaction type (PDI). Set it on the product profile.";
            var lineTaxIds = FbrInvoiceLineTaxIds.Parse(line);
            if (lineTaxIds.Count == 0)
                return "Each line must have a sales tax rate.";
            foreach (var tid in lineTaxIds)
            {
                if (!taxRows.TryGetValue(tid, out var tr))
                    return "Invalid sales tax rate on a line.";
                if (!tr.IsEffectiveOn(asOf))
                    return $"Sales tax rate \"{tr.Label}\" is not effective on the invoice date.";
            }
        }

        return null;
    }

    private async Task<FbrDigitalInvoicePayload> BuildFbrPayloadAsync(
        FbrInvoice inv,
        Company company,
        int companyId,
        CancellationToken ct)
    {
        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == inv.CustomerPartyId &&
                (x.CompanyID == null || x.CompanyID == companyId), ct);

        var scenario = await _db.FbrScenarios.AsNoTracking()
            .FirstAsync(x => x.Id == inv.FbrScenarioId && x.CompanyId == companyId, ct);

        var lineList = inv.Lines.OrderBy(x => x.SortOrder).ToList();
        var profileIds = lineList.Select(x => x.ProductProfileId).Distinct().ToList();
        var profiles = await _db.ProductProfiles.AsNoTracking()
            .Where(x => profileIds.Contains(x.Id) && x.CompanyId == companyId)
            .ToDictionaryAsync(x => x.Id, ct);

        var pdiTypeIds = profiles.Values
            .Select(x => x.FbrPdiTransTypeId)
            .Where(x => x is > 0)
            .Cast<int>()
            .Distinct()
            .ToList();
        var pdiTypes = await _db.FbrPdiTransTypes.AsNoTracking()
            .Where(x => x.CompanyId == companyId && pdiTypeIds.Contains(x.TransTypeId))
            .ToDictionaryAsync(x => x.TransTypeId, x => x.Description, ct);

        var sroItemIds = profiles.Values
            .Select(x => x.SroItemId)
            .Where(x => x is > 0)
            .Cast<int>()
            .Distinct()
            .ToList();
        var sroItems = await _db.FbrSroItems.AsNoTracking()
            .Where(x => sroItemIds.Contains(x.Id))
            .ToListAsync(ct);
        var schIds = sroItems.Select(x => x.SroId).Distinct().ToList();
        var schedules = await _db.FbrSroSchedules.AsNoTracking()
            .Where(x => schIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.SerNo ?? "", ct);

        var sroMeta = new Dictionary<int, (string SerNo, string ItemDesc)>();
        foreach (var si in sroItems)
        {
            schedules.TryGetValue(si.SroId, out var ser);
            sroMeta[si.Id] = (ser ?? "", si.SroItemDesc ?? "");
        }

        var sellerProvince = await ResolveProvinceNameAsync(companyId, company.FbrProvinceId, ct);
        var buyerProvince = await ResolveProvinceNameAsync(companyId, customer?.ProvinceID, ct);

        var uomIds = profiles.Values
            .Select(x => x.FbrUomId)
            .Where(x => x is > 0)
            .Cast<int>()
            .Distinct()
            .ToList();
        var uomDesc = await _db.FbrPdiUoms.AsNoTracking()
            .Where(x => x.CompanyId == companyId && uomIds.Contains(x.UomId))
            .ToDictionaryAsync(x => x.UomId, x => x.Description, ct);

        var taxIds = lineList
            .SelectMany(l => FbrInvoiceLineTaxIds.Parse(l))
            .Where(x => x > 0)
            .Distinct()
            .ToList();
        var salesTaxRateById = await FbrSalesTaxRateQueries.GetByIdsAsync(_db, companyId, taxIds, ct);

        return FbrInvoicePayloadBuilder.Build(
            inv,
            company,
            customer,
            lineList,
            profiles,
            scenario.ScenarioCode,
            sellerProvince,
            buyerProvince,
            sroMeta,
            uomDesc,
            salesTaxRateById,
            pdiTypes);
    }

    private async Task<string?> ResolveProvinceNameAsync(int companyId, int? provinceId, CancellationToken ct)
    {
        if (provinceId is null or <= 0)
            return null;

        var fromPdi = await _db.FbrPdiProvinces.AsNoTracking()
            .Where(x => x.CompanyId == companyId && x.StateProvinceCode == provinceId.Value)
            .Select(x => x.Description)
            .FirstOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(fromPdi))
            return fromPdi;

        return await _db.FbrProvinces.AsNoTracking()
            .Where(x =>
                x.Id == provinceId.Value &&
                (x.CompanyID == null || x.CompanyID == 0 || x.CompanyID == companyId))
            .Select(x => x.Provincename)
            .FirstOrDefaultAsync(ct);
    }

    private static (string? Token, bool UseSandboxUrls) ResolveFbrToken(Company company) =>
        company.EnableSandBox
            ? (company.FbrTokenSandBox?.Trim(), true)
            : (company.FbrTokenProduction?.Trim(), false);

    private static bool IsFbrSuccess(FbrApiResponseDto response) =>
        string.Equals(response.ValidationResponse?.StatusCode, "00", StringComparison.Ordinal);

    private static string FormatFbrErrors(FbrApiResponseDto r)
    {
        var vr = r.ValidationResponse;
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(vr?.Error))
            parts.Add(vr.Error!);
        if (vr?.InvoiceStatuses != null)
        {
            foreach (var st in vr.InvoiceStatuses)
            {
                if (!string.IsNullOrWhiteSpace(st?.Error))
                    parts.Add($"Line {st.ItemSNo}: {st.Error}");
            }
        }

        if (parts.Count == 0 && !string.IsNullOrWhiteSpace(r.ErrorMessage))
            parts.Add(r.ErrorMessage!);
        return parts.Count > 0 ? string.Join(" ", parts) : "FBR validation failed.";
    }

    private static string? TruncateForDb(string? json) =>
        TruncateForDb(json, 120_000);

    private static string? TruncateForDb(string? json, int maxLen) =>
        json == null ? null : (json.Length <= maxLen ? json : json[..maxLen]);

    private static string? TruncateErr(string? err, int maxLen) =>
        err == null ? null : (err.Length <= maxLen ? err : err[..maxLen]);

    private static string SanitizeNewInvoiceStatus(string? status)
    {
        var s = string.IsNullOrWhiteSpace(status) ? "ordered" : status.Trim();
        return s is "ordered" or "cancelled" ? s : "ordered";
    }

    private static string SanitizeInvoiceStatusOnUpdate(string current, string? requested)
    {
        if (string.IsNullOrWhiteSpace(requested))
            return current;
        var r = requested.Trim();
        if (r is "delivered" or "posted")
            return current;
        if (string.Equals(current, "delivered", StringComparison.OrdinalIgnoreCase))
            return "delivered";
        if (string.Equals(current, "posted", StringComparison.OrdinalIgnoreCase))
            return "posted";
        return r is "ordered" or "cancelled" ? r : current;
    }

    private static string? TrimOrNull(string? s) =>
        string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    /// <summary>Excel/import often stores 13-digit buyer id in SaleTaxRegNo; FBR list should still show it.</summary>
    private static string? ListDisplayCustomerNtn(CustomerParty? c)
    {
        if (c == null) return null;
        return TrimOrNull(c.NTNNO) ?? TrimOrNull(c.SaleTaxRegNo);
    }

    private static string? ListDisplayCustomerPhone(CustomerParty? c)
    {
        if (c == null) return null;
        return TrimOrNull(c.PhoneOne) ?? TrimOrNull(c.ContactPersonMobile);
    }

    private int GetCompanyIdOrThrow()
    {
        var raw = User.FindFirstValue("companyId");
        if (!int.TryParse(raw, out var companyId))
            throw new UnauthorizedAccessException("Missing companyId claim.");
        return companyId;
    }

    private async Task<User?> GetCurrentUserAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var userId)) return null;
        return await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public sealed class UpsertFbrInvoiceRequest
    {
        public string? Reference { get; set; }
        public int CustomerPartyId { get; set; }
        /// <summary>
        /// Business invoice date (date-only). Preferred over <see cref="InvoiceDateUtc"/> for all new clients.
        /// Format: yyyy-MM-dd
        /// </summary>
        public string? InvoiceDate { get; set; }
        public DateTime? InvoiceDateUtc { get; set; }
        public string? PaymentTerms { get; set; }
        public string? Status { get; set; }
        public bool Returned { get; set; }
        public decimal DeliveryFees { get; set; }
        public int? FbrScenarioId { get; set; }
        /// <summary>From Excel UniqueInvoiceID; unique per company when set.</summary>
        public int? ExcelUniqueInvoiceId { get; set; }
        /// <summary>When true, duplicate Reference or ExcelUniqueInvoiceId causes failure (Excel import).</summary>
        public bool StrictImportDuplicateCheck { get; set; }
        public List<UpsertFbrInvoiceLineRequest>? Lines { get; set; }
    }

    public sealed class UpsertFbrInvoiceLineRequest
    {
        public Guid ProductProfileId { get; set; }
        public decimal Quantity { get; set; } = 1;
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
        public int? FbrSalesTaxRateId { get; set; }
        /// <summary>When set (1+ ids), replaces <see cref="FbrSalesTaxRateId"/> for persistence; percentages are summed.</summary>
        public List<int>? FbrSalesTaxRateIds { get; set; }
        public decimal DiscountRate { get; set; }
        /// <summary>Invoice override: when true, tax base is MRP (Fixed notified); when false, use sale net.</summary>
        public bool FixedNotifiedApplicable { get; set; }
        /// <summary>Invoice override: MRP value used when <see cref="FixedNotifiedApplicable"/> is true (0 clears).</summary>
        public decimal MrpRateValue { get; set; }
        public string? Remarks { get; set; }
    }

    public sealed class PostChatterRequest
    {
        public string? Body { get; set; }
        public List<PostChatterAttachment>? Attachments { get; set; }
    }

    public sealed class PostChatterAttachment
    {
        public string? Name { get; set; }
        public string? Mime { get; set; }
        public string? DataBase64 { get; set; }
    }

    public sealed class FbrInvoiceListDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string Reference { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; }
        public int CustomerPartyId { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerBusinessLogo { get; set; }
        public string? CustomerAddress { get; set; }
        public string? CustomerNtn { get; set; }
        public string? CustomerPhone { get; set; }
        public string InvoiceDate { get; set; } = "";
        public string PaymentTerms { get; set; } = "";
        public string Status { get; set; } = "";
        public bool Returned { get; set; }
        public decimal DeliveryFees { get; set; }
        public decimal TotalExTaxes { get; set; }
        public decimal Taxes { get; set; }
        public decimal Total { get; set; }
        public string? FbrInvoiceNumber { get; set; }
        public int? FbrScenarioId { get; set; }
        public DateTime? ValidatedAtUtc { get; set; }
        public DateTime? PostedAtUtc { get; set; }
        public bool IsLocked { get; set; }
    }

    public sealed class FbrInvoiceDetailDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string Reference { get; set; } = "";
        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
        public string? CreatedByDisplayName { get; set; }
        public string? UpdatedByDisplayName { get; set; }
        public int CustomerPartyId { get; set; }
        public string InvoiceDate { get; set; } = "";
        public string PaymentTerms { get; set; } = "";
        public string Status { get; set; } = "";
        public string? FbrInvoiceNumber { get; set; }
        public bool IsLocked { get; set; }
        public DateTime? ValidatedAtUtc { get; set; }
        public DateTime? PostedAtUtc { get; set; }
        public string? FbrLastError { get; set; }
        public string? FbrLastResponseJson { get; set; }
        public bool Returned { get; set; }
        public decimal DeliveryFees { get; set; }
        public decimal TotalExTaxes { get; set; }
        public decimal Taxes { get; set; }
        public decimal Total { get; set; }
        public decimal TaxRate { get; set; }
        public int? FbrScenarioId { get; set; }
        public List<FbrInvoiceLineDto> Lines { get; set; } = new();
        public List<ChatterMessageDto> ChatterMessages { get; set; } = new();
    }

    private static DateOnly ResolveInvoiceDateOnlyOrDefault(string? dateOnly, DateTime? fallbackUtc)
    {
        if (!string.IsNullOrWhiteSpace(dateOnly) && DateOnly.TryParse(dateOnly.Trim(), out var parsed))
            return parsed;
        var dt = fallbackUtc ?? DateTime.UtcNow;
        return DateOnly.FromDateTime(dt);
    }

    public sealed class FbrInvoiceLineDto
    {
        public Guid Id { get; set; }
        public Guid ProductProfileId { get; set; }
        public string? ProductNo { get; set; }
        public string? ProductName { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
        public int? FbrSalesTaxRateId { get; set; }
        public List<int>? FbrSalesTaxRateIds { get; set; }
        public decimal DiscountRate { get; set; }
        public bool FixedNotifiedApplicable { get; set; }
        public decimal MrpRateValue { get; set; }
        public string HsCode { get; set; } = "";
        /// <summary>Legacy snapshot; invoice UI uses <see cref="SroScheduleNoText"/> / <see cref="SroItemRefText"/> from product profile.</summary>
        public string SroItemText { get; set; } = "";
        /// <summary>From product profile free-text schedule (e.g. SRO 2023/2501).</summary>
        public string SroScheduleNoText { get; set; } = "";
        /// <summary>From product profile free-text item ref (e.g. 45(i)).</summary>
        public string SroItemRefText { get; set; } = "";
        /// <summary>PDI transaction type description for <c>FbrPdiTransTypeId</c> (FBR sale type).</summary>
        public string FbrSaleTypeText { get; set; } = "";
        public string Remarks { get; set; } = "";
    }

    public sealed class ChatterMessageDto
    {
        public Guid Id { get; set; }
        public string Body { get; set; } = "";
        public string CreatedAt { get; set; } = "";
        public string? AuthorDisplayName { get; set; }
        public List<ChatterAttachmentDto>? Attachments { get; set; }
    }

    public sealed class ChatterAttachmentDto
    {
        public string? Name { get; set; }
        public string? Mime { get; set; }
        public string? DataBase64 { get; set; }
    }

    public sealed class FbrInvoiceImportResponseDto
    {
        public int Created { get; set; }
        public int Failed { get; set; }
        public List<FbrInvoiceImportRowResultDto> Results { get; set; } = new();
    }

    public sealed class FbrInvoiceDemoSeedResponseDto
    {
        public int Created { get; set; }
        public List<string> Errors { get; set; } = new();
        public List<Guid> InvoiceIds { get; set; } = new();
    }

    public sealed class FbrInvoiceImportRowResultDto
    {
        public string GroupKey { get; set; } = "";
        public int FirstExcelRow { get; set; }
        public string? Reference { get; set; }
        public Guid? InvoiceId { get; set; }
        public string? Error { get; set; }
    }
}
