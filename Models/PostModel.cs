namespace Photogram_Api.Models
{
    public class PostModel
    {
        public string? Key { get; set; }

        public List<UserPhotoViewModel>? UserPhoto { get; set; }
    }
}
