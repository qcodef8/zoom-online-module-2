import httpRequest from '../utils/httpRequest.js';

class ArtistsAPI {
    // Get all artists with optional search and pagination
    async getAllArtists(options = {}) {
        const { search, page = 1, limit = 20, sort = 'name' } = options;
        
        let endpoint = '/artists';
        const params = new URLSearchParams();
        
        if (search) params.append('search', search);
        if (page > 1) params.append('page', page);
        if (limit !== 20) params.append('limit', limit);
        if (sort !== 'name') params.append('sort', sort);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await httpRequest.get(endpoint);
    }

    // Get trending artists
    async getTrendingArtists(options = {}) {
        const { limit = 10, timeRange = 'week' } = options;
        
        let endpoint = '/artists/trending';
        const params = new URLSearchParams();
        
        if (limit !== 10) params.append('limit', limit);
        if (timeRange !== 'week') params.append('time_range', timeRange);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await httpRequest.get(endpoint);
    }

    // Get artist by ID
    async getArtist(id) {
        return await httpRequest.get(`/artists/${id}`);
    }

    // Get artist's popular tracks
    async getArtistPopularTracks(id, options = {}) {
        const { limit = 10 } = options;
        
        let endpoint = `/artists/${id}/tracks/popular`;
        if (limit !== 10) {
            endpoint += `?limit=${limit}`;
        }
        
        return await httpRequest.get(endpoint);
    }

    // Get artist's albums
    async getArtistAlbums(id, options = {}) {
        const { page = 1, limit = 20, type = 'all' } = options;
        
        let endpoint = `/artists/${id}/albums`;
        const params = new URLSearchParams();
        
        if (page > 1) params.append('page', page);
        if (limit !== 20) params.append('limit', limit);
        if (type !== 'all') params.append('type', type);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await httpRequest.get(endpoint);
    }

    // Follow artist (authenticated)
    async followArtist(id) {
        return await httpRequest.post(`/artists/${id}/follow`);
    }

    // Unfollow artist (authenticated)
    async unfollowArtist(id) {
        return await httpRequest.delete(`/artists/${id}/follow`);
    }

    // Create new artist (admin only)
    async createArtist(data) {
        return await httpRequest.post('/artists', data);
    }

    // Update artist (admin only)
    async updateArtist(id, data) {
        return await httpRequest.put(`/artists/${id}`, data);
    }

    // Delete artist (admin only)
    async deleteArtist(id) {
        return await httpRequest.delete(`/artists/${id}`);
    }

    // Get followed artists (authenticated)
    async getFollowedArtists(options = {}) {
        const { page = 1, limit = 20 } = options;
        
        let endpoint = '/me/artists/followed';
        const params = new URLSearchParams();
        
        if (page > 1) params.append('page', page);
        if (limit !== 20) params.append('limit', limit);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await httpRequest.get(endpoint);
    }

    // Search artists specifically
    async searchArtists(query, options = {}) {
        const { page = 1, limit = 20 } = options;
        
        let endpoint = '/search/artists';
        const params = new URLSearchParams();
        
        params.append('q', query);
        if (page > 1) params.append('page', page);
        if (limit !== 20) params.append('limit', limit);
        
        endpoint += `?${params.toString()}`;
        
        return await httpRequest.get(endpoint);
    }
}

const artistsAPI = new ArtistsAPI();
export default artistsAPI;
