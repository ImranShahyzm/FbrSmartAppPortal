using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace FbrSmartApp.Api.Services;

public sealed class PasswordHasher
{
    public string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var subkey = KeyDerivation.Pbkdf2(
            password: password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: 100_000,
            numBytesRequested: 32
        );

        return $"pbkdf2$100000${Convert.ToBase64String(salt)}${Convert.ToBase64String(subkey)}";
    }

    public bool VerifyPassword(string password, string storedHash)
    {
        // Format: pbkdf2$<iterations>$<saltB64>$<subkeyB64>
        var parts = storedHash.Split('$', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 4) return false;
        if (!string.Equals(parts[0], "pbkdf2", StringComparison.Ordinal)) return false;
        if (!int.TryParse(parts[1], out var iterations)) return false;

        byte[] salt;
        byte[] expectedSubkey;
        try
        {
            salt = Convert.FromBase64String(parts[2]);
            expectedSubkey = Convert.FromBase64String(parts[3]);
        }
        catch
        {
            return false;
        }

        var actualSubkey = KeyDerivation.Pbkdf2(
            password: password,
            salt: salt,
            prf: KeyDerivationPrf.HMACSHA256,
            iterationCount: iterations,
            numBytesRequested: expectedSubkey.Length
        );

        return CryptographicOperations.FixedTimeEquals(actualSubkey, expectedSubkey);
    }
}
