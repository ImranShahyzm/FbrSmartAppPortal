using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.RecordRules;

namespace FbrSmartApp.Api.Tests;

public sealed class RecordRuleExpressionBuilderTests
{
    private static RecordRuleContext Ctx(int companyId) =>
        new()
        {
            UserId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            CompanyId = companyId,
            AllowedCompanyIds = new[] { companyId },
        };

    [Fact]
    public void TryBuild_Eq_CompanyId_Context_Matches()
    {
        var rule = new GroupRecordRule
        {
            FieldName = "CompanyId",
            Operator = "eq",
            RightOperandJson = """{"kind":"context","ref":"currentUser.companyId"}""",
        };
        var pred = RecordRuleExpressionBuilder.TryBuild<FbrInvoice>(rule, Ctx(7));
        Assert.NotNull(pred);
        var f = pred!.Compile();
        Assert.True(f(new FbrInvoice { CompanyId = 7 }));
        Assert.False(f(new FbrInvoice { CompanyId = 8 }));
    }

    [Fact]
    public void TryBuild_Eq_Status_Literal_Matches()
    {
        var rule = new GroupRecordRule
        {
            FieldName = "Status",
            Operator = "eq",
            RightOperandJson = """{"kind":"literal","value":"ordered"}""",
        };
        var pred = RecordRuleExpressionBuilder.TryBuild<FbrInvoice>(rule, Ctx(1));
        Assert.NotNull(pred);
        var f = pred!.Compile();
        Assert.True(f(new FbrInvoice { Status = "ordered" }));
        Assert.False(f(new FbrInvoice { Status = "posted" }));
    }

    [Fact]
    public void TryBuild_In_CompanyId_AllowedCompanies()
    {
        var rule = new GroupRecordRule
        {
            FieldName = "CompanyId",
            Operator = "in",
            RightOperandJson = """{"kind":"context","ref":"currentUser.allowedCompanyIds"}""",
        };
        var ctx = new RecordRuleContext
        {
            UserId = Guid.NewGuid(),
            CompanyId = 1,
            AllowedCompanyIds = new[] { 2, 3 },
        };
        var pred = RecordRuleExpressionBuilder.TryBuild<FbrInvoice>(rule, ctx);
        Assert.NotNull(pred);
        var f = pred!.Compile();
        Assert.True(f(new FbrInvoice { CompanyId = 2 }));
        Assert.False(f(new FbrInvoice { CompanyId = 99 }));
    }
}
