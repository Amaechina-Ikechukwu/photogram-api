
namespace Photogram_Api.Models
{
    public class PhotoModel
    {
        public string? id { get; set; }
        public string? Uid { get; set; }
        public string? ImageUrl { get; set; }
        public string? Category { get; set; }
        public List<string>? Tags { get; set; }
        public long? CreatedAt { get; set; }

    }
}
