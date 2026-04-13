using System.Linq.Expressions;
using FbrSmartApp.Api.Models;
using FbrSmartApp.Api.Services.RecordRules;

namespace FbrSmartApp.Api.Tests;

public sealed class RecordRuleExpressionCombinerTests
{
    [Fact]
    public void CombineAnd_BothMustHold()
    {
        Expression<Func<FbrInvoice, bool>> a = x => x.CompanyId == 1;
        Expression<Func<FbrInvoice, bool>> b = x => x.Status == "ordered";
        var c = RecordRuleExpressionCombiner.CombineAnd(new List<Expression<Func<FbrInvoice, bool>>> { a, b });
        Assert.NotNull(c);
        var f = c!.Compile();
        Assert.True(f(new FbrInvoice { CompanyId = 1, Status = "ordered" }));
        Assert.False(f(new FbrInvoice { CompanyId = 1, Status = "posted" }));
    }

    [Fact]
    public void CombineOr_EitherHolds()
    {
        Expression<Func<FbrInvoice, bool>> a = x => x.CompanyId == 1;
        Expression<Func<FbrInvoice, bool>> b = x => x.CompanyId == 2;
        var c = RecordRuleExpressionCombiner.CombineOr(new List<Expression<Func<FbrInvoice, bool>>> { a, b });
        Assert.NotNull(c);
        var f = c!.Compile();
        Assert.True(f(new FbrInvoice { CompanyId = 1, Status = "ordered" }));
        Assert.True(f(new FbrInvoice { CompanyId = 2, Status = "ordered" }));
        Assert.False(f(new FbrInvoice { CompanyId = 99, Status = "ordered" }));
    }
}
