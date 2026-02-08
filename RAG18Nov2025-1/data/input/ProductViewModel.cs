// Models/ProductViewModel.cs
public class ProductViewModel
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Category { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string? ImageUrl { get; set; }
    public double Rating { get; set; } = 4.2;
    public int ReviewCount { get; set; } = 128;
    public bool IsNew { get; set; }
    public List<string> Tags { get; set; } = new();
}

// Controllers/ProductsController.cs
using Microsoft.AspNetCore.Mvc;

namespace ModernStore.Controllers;

public class ProductsController : Controller
{
    private static readonly List<ProductViewModel> FakeDb = new()
    {
        new() { Id = 1, Name = "Midnight Carbon Fiber Watch", Category = "Watches", Price = 349.99m, Stock = 23,
                ImageUrl = "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3", IsNew = true,
                Tags = new(){"limited", "carbon", "automatic"} },
        new() { Id = 2, Name = "Aether Noise-Cancelling Over-Ear", Category = "Audio", Price = 289.00m, Stock = 41,
                ImageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e", Rating = 4.7,
                Tags = new(){"ANC", "bluetooth-5.3", "60h-battery"} },
        new() { Id = 3, Name = "Eclipse Mechanical Keyboard v2", Category = "Peripherals", Price = 189.50m, Stock = 7,
                ImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c", Rating = 4.9, ReviewCount = 347,
                Tags = new(){"hotswap", "gateron-ink-black", "rgb"} },
        new() { Id = 4, Name = "Titanium EDC Carabiner Multi-tool", Category = "EDC", Price = 79.00m, Stock = 84,
                ImageUrl = "https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84" },
        new() { Id = 5, Name = "Lunar White Ceramic Coffee Mug 480ml", Category = "Home", Price = 39.99m, Stock = 112,
                ImageUrl = "https://images.unsplash.com/photo-1572110603756-4d67d2d4d6a5", IsNew = true }
    };

    public IActionResult Index()
    {
        var model = FakeDb
            .OrderByDescending(p => p.IsNew)
            .ThenByDescending(p => p.Rating)
            .ToList();

        ViewBag.PageTitle = "Curated Gear • Winter 2026";
        ViewBag.ShowFilters = true;

        return View(model);
    }

    [HttpGet]
    public IActionResult QuickView(int id)
    {
        var product = FakeDb.FirstOrDefault(p => p.Id == id);
        if (product == null) return NotFound();

        return PartialView("_QuickView", product);
    }
}