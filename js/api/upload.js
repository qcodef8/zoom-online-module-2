import httpRequest from "../utils/httpRequest.js";

class UploadAPI {
    async uploadImage(file) {
        const formData = new FormData();
        formData.append("file", file);
        return await httpRequest.postForm("/upload/images", formData);
    }

    async uploadPlaylistCover(playlistId, file) {
        const formData = new FormData();
        formData.append("file", file);
        return await httpRequest.postForm(
            `/upload/playlist/${playlistId}/cover`,
            formData
        );
    }
}

const uploadAPI = new UploadAPI();
export default uploadAPI;
