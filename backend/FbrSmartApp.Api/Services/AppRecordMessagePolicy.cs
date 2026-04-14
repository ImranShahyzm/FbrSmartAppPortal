namespace FbrSmartApp.Api.Services;

/// <summary>Maps AppRecordMessage.ResourceKey values to flat permission strings.</summary>
public static class AppRecordMessagePolicy
{
    public static bool TryResolvePermissions(string resourceKey, out string readPermission, out string writePermission)
    {
        readPermission = "";
        writePermission = "";
        if (string.IsNullOrWhiteSpace(resourceKey)) return false;
        switch (resourceKey.Trim().ToLowerInvariant())
        {
            case "glvouchertypes":
                readPermission = "accounting.glVoucherTypes.read";
                writePermission = "accounting.glVoucherTypes.write";
                return true;
            case "gljournalvouchers":
                readPermission = "accounting.glJournalVouchers.read";
                writePermission = "accounting.glJournalVouchers.write";
                return true;
            case "genbankinformation":
                readPermission = "accounting.genBankInformation.read";
                writePermission = "accounting.genBankInformation.write";
                return true;
            case "gencashinformation":
                readPermission = "accounting.genCashInformation.read";
                writePermission = "accounting.genCashInformation.write";
                return true;
            default:
                return false;
        }
    }
}
