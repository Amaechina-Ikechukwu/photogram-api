using Newtonsoft.Json;

namespace Photogram_Api.Models
{
    public class UserPhotoViewModel
    {
        public string Id { get; set; }
        [JsonProperty("createdAt")]
        public long CreatedAt { get; set; }
        public string ImageUrl { get; set; }
        public List<string> Tags { get; set; }
        public string Uid { get; set; }
    }
}

