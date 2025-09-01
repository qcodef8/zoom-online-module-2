import httpRequest from "../utils/httpRequest.js";

class PlaylistsAPI {
    // Get all playlists with optional search and pagination
    async getAllPlaylists(options = {}) {
        const { search, page = 1, limit = 20, sort = "created_at" } = options;

        let endpoint = "/playlists";
        const params = new URLSearchParams();

        if (search) params.append("search", search);
        if (page > 1) params.append("page", page);
        if (limit !== 20) params.append("limit", limit);
        if (sort !== "created_at") params.append("sort", sort);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await httpRequest.get(endpoint);
    }

    // Get playlist by ID
    async getPlaylist(id) {
        return await httpRequest.get(`/playlists/${id}`);
    }

    // Get tracks in playlist
    async getPlaylistTracks(id, options = {}) {
        const { page = 1, limit = 20 } = options;

        let endpoint = `/playlists/${id}/tracks`;
        const params = new URLSearchParams();

        if (page > 1) params.append("page", page);
        if (limit !== 20) params.append("limit", limit);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await httpRequest.get(endpoint);
    }

    // Create new playlist (authenticated)
    async createPlaylist(data) {
        return await httpRequest.post("/playlists", data);
    }

    // Update playlist (owner only)
    async updatePlaylist(id, data) {
        return await httpRequest.put(`/playlists/${id}`, data);
    }

    // Delete playlist (owner only)
    async deletePlaylist(id) {
        return await httpRequest.delete(`/playlists/${id}`);
    }

    // Add track to playlist (owner only)
    async addTrackToPlaylist(playlistId, trackId, position = null) {
        const data = { track_id: trackId };
        if (position !== null) {
            data.position = position;
        }
        return await httpRequest.post(`/playlists/${playlistId}/tracks`, data);
    }

    // Remove track from playlist (owner only)
    async removeTrackFromPlaylist(playlistId, trackId) {
        return await httpRequest.delete(
            `/playlists/${playlistId}/tracks/${trackId}`
        );
    }

    // Reorder tracks in playlist (owner only)
    async reorderPlaylistTracks(playlistId, trackId, newPosition) {
        return await httpRequest.put(
            `/playlists/${playlistId}/tracks/${trackId}/position`,
            {
                position: newPosition,
            }
        );
    }

    // Follow playlist (authenticated)
    async followPlaylist(id) {
        return await httpRequest.post(`/playlists/${id}/follow`);
    }

    // Unfollow playlist (authenticated)
    async unfollowPlaylist(id) {
        return await httpRequest.delete(`/playlists/${id}/follow`);
    }

    // Get user's playlists (authenticated)
    async getUserPlaylists(options = {}) {
        const { page = 1, limit = 20 } = options;

        let endpoint = "/me/playlists";
        const params = new URLSearchParams();

        if (page > 1) params.append("page", page);
        if (limit !== 20) params.append("limit", limit);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await httpRequest.get(endpoint);
    }

    // Get followed playlists (authenticated)
    async getFollowedPlaylists(options = {}) {
        const { page = 1, limit = 20 } = options;

        let endpoint = "/me/playlists/followed";
        const params = new URLSearchParams();

        if (page > 1) params.append("page", page);
        if (limit !== 20) params.append("limit", limit);

        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return await httpRequest.get(endpoint);
    }
}

const playlistsAPI = new PlaylistsAPI();
export default playlistsAPI;
