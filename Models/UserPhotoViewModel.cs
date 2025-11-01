using Newtonsoft.Json;

namespace Photogram_Api.Models
{
    public class UserPhotoViewModel
    {
        public string Id { get; set; } = string.Empty;
        [JsonProperty("createdAt")]
        public long CreatedAt { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public List<string> Tags { get; set; } = new List<string>();
        public string Uid { get; set; } = string.Empty;
    }
}

