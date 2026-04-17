using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FbrSmartApp.Api.Data.Migrations.AppDb
{
    /// <inheritdoc />
    public partial class SyncInventItemsModelSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "gen_Pes_PhaseTagLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyID = table.Column<int>(type: "int", nullable: false),
                    ResourceKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RecordId = table.Column<int>(type: "int", nullable: false),
                    PhaseTagID = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gen_Pes_PhaseTagLinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "gen_Pes_PhaseTags",
                columns: table => new
                {
                    PhaseTagID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TagName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CompanyID = table.Column<int>(type: "int", nullable: true),
                    EntryUserID = table.Column<int>(type: "int", nullable: true),
                    EntryUserDateTime = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TagColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_gen_Pes_PhaseTags", x => x.PhaseTagID);
                });

            migrationBuilder.CreateIndex(
                name: "UX_FbrInvoices_Company_InvoiceNumber",
                table: "FbrInvoices",
                columns: new[] { "CompanyId", "InvoiceNumber" },
                unique: true,
                filter: "[InvoiceNumber] IS NOT NULL AND [InvoiceNumber] <> N''");

            migrationBuilder.CreateIndex(
                name: "IX_gen_Pes_PhaseTagLinks_CompanyID_ResourceKey_RecordId",
                table: "gen_Pes_PhaseTagLinks",
                columns: new[] { "CompanyID", "ResourceKey", "RecordId" });

            migrationBuilder.CreateIndex(
                name: "IX_gen_Pes_PhaseTagLinks_CompanyID_ResourceKey_RecordId_PhaseTagID",
                table: "gen_Pes_PhaseTagLinks",
                columns: new[] { "CompanyID", "ResourceKey", "RecordId", "PhaseTagID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_gen_Pes_PhaseTags_CompanyID_TagName",
                table: "gen_Pes_PhaseTags",
                columns: new[] { "CompanyID", "TagName" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "gen_Pes_PhaseTagLinks");

            migrationBuilder.DropTable(
                name: "gen_Pes_PhaseTags");

            migrationBuilder.DropIndex(
                name: "UX_FbrInvoices_Company_InvoiceNumber",
                table: "FbrInvoices");
        }
    }
}
