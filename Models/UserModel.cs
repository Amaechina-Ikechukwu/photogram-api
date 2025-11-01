namespace Photogram_Api.Models
{
    public class UserModel
    {
        public string? Name { get; set; }
        public string? Uid { get; set; }
        public string? Email { get; set; }
        public int NumberOfUploads { get; set; }
        public int TotalViews { get; set; }
        public int TotalLikes { get; set; }
    }
}