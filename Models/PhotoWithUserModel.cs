using Photogram_Api.Models;

namespace Photogram_Api.Models
{
    public class PhotoWithUserModel
    {
        public PhotoModel? Photo { get; set; }
        public UserModel? User { get; set; }
    }
}
