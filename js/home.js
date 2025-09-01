import httpRequest from "./utils/httpRequest.js";
import { showToast } from "./utils/toast.js";

class HomePage {
    constructor() {
        this.init();
    }

    async init() {
        try {
            await this.loadHomeData();
            this.setupEventListeners();
        } catch (error) {
            console.error("Failed to initialize home page:", error);
            showToast("Failed to load home page data", "error");
        }
    }

    async loadHomeData() {
        try {
            // Load data in parallel for better performance
            const [playlists, artists, userPlaylists, userArtists] =
                await Promise.all([
                    this.loadPlaylists(),
                    this.loadArtists(),
                    this.loadUserPlaylists(),
                    this.loadUserArtists(),
                ]);

            this.renderPlaylists(playlists);
            this.renderArtists(artists);
            this.renderSidebarContent(userPlaylists, userArtists);
        } catch (error) {
            console.error("Error loading home data:", error);
            showToast("Failed to load home data", "error");
        }
    }

    async loadPlaylists() {
        try {
            const response = await httpRequest.get("/playlists");
            console.log("Playlists API response:", response);

            // Handle different response structures
            let playlists = [];
            if (response && response.data) {
                playlists = response.data;
            } else if (Array.isArray(response)) {
                playlists = response;
            } else if (response && Array.isArray(response.playlists)) {
                playlists = response.playlists;
            }

            return playlists;
        } catch (error) {
            console.error("Error loading playlists:", error);
            return [];
        }
    }

    async loadArtists() {
        try {
            const response = await httpRequest.get("/artists");

            // Handle different response structures
            let artists = [];
            if (response && response.data) {
                artists = response.data;
            } else if (Array.isArray(response)) {
                artists = response;
            } else if (response && Array.isArray(response.artists)) {
                artists = response.artists;
            }

            return artists;
        } catch (error) {
            console.error("Error loading artists:", error);
            return [];
        }
    }

    async loadUserPlaylists() {
        try {
            // Check if user is authenticated
            if (!httpRequest.isAuthenticated()) {
                console.log("User not authenticated, skipping user playlists");
                return [];
            }

            const response = await httpRequest.get("/me/playlists");
            console.log("User playlists API response:", response);

            let userPlaylists = [];
            if (response && response.data) {
                userPlaylists = response.data;
            } else if (Array.isArray(response)) {
                userPlaylists = response;
            } else if (response && Array.isArray(response.playlists)) {
                userPlaylists = response.playlists;
            }

            return userPlaylists;
        } catch (error) {
            console.error("Error loading user playlists:", error);

            // Handle authentication errors
            if (error.statusCode === 401) {
                console.log("User not authenticated or token expired");
                // Optionally redirect to login or show login prompt
            }

            return [];
        }
    }

    async loadUserArtists() {
        try {
            // Check if user is authenticated
            if (!httpRequest.isAuthenticated()) {
                console.log("User not authenticated, skipping user artists");
                return [];
            }

            const response = await httpRequest.get("/me/artists/followed");
            console.log("User artists API response:", response);

            let userArtists = [];
            if (response && response.data) {
                userArtists = response.data;
            } else if (Array.isArray(response)) {
                userArtists = response.artists;
            } else if (response && Array.isArray(response.artists)) {
                userArtists = response.artists;
            }

            return userArtists;
        } catch (error) {
            console.error("Error loading user artists:", error);

            // Handle authentication errors
            if (error.statusCode === 401) {
                console.log("User not authenticated or token expired");
                // Optionally redirect to login or show login prompt
            }

            return [];
        }
    }

    renderPlaylists(playlists) {
        const hitsGrid = document.querySelector(".hits-grid");
        if (!hitsGrid) return;

        // Clear existing content
        hitsGrid.innerHTML = "";

        // Validate playlists data
        if (!playlists || !Array.isArray(playlists) || playlists.length === 0) {
            hitsGrid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-music"></i>
                    <p>No playlists available</p>
                    <small>Debug: ${
                        playlists
                            ? `Type: ${typeof playlists}, Length: ${
                                  playlists.length
                              }`
                            : "Data is null/undefined"
                    }</small>
                </div>
            `;
            return;
        }

        // Take first 6 playlists for display
        const displayPlaylists = playlists.slice(0, 6);
        console.log("Display playlists:", displayPlaylists);

        displayPlaylists.forEach((playlist) => {
            const playlistCard = this.createPlaylistCard(playlist);
            hitsGrid.appendChild(playlistCard);
        });
    }

    renderArtists(artists) {
        const artistsGrid = document.querySelector(".artists-grid");
        if (!artistsGrid) return;

        // Clear existing content
        artistsGrid.innerHTML = "";

        // Validate artists data
        if (!artists || !Array.isArray(artists) || artists.length === 0) {
            artistsGrid.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-user"></i>
                    <p>No artists available</p>
                    <small>Debug: ${
                        artists
                            ? `Type: ${typeof artists}, Length: ${
                                  artists.length
                              }`
                            : "Data is null/undefined"
                    }</small>
                </div>
            `;
            return;
        }

        // Take first 5 artists for display
        const displayArtists = artists.slice(0, 5);

        displayArtists.forEach((artist) => {
            const artistCard = this.createArtistCard(artist);
            artistsGrid.appendChild(artistCard);
        });
    }

    renderSidebarContent(userPlaylists, userArtists) {
        this.userPlaylists = userPlaylists || [];
        this.userArtists = userArtists || [];

        // Check authentication status
        const isAuthenticated = httpRequest.isAuthenticated();

        if (!isAuthenticated) {
            this.showUnauthenticatedState();
        } else {
            // Initially show playlists tab
            this.showPlaylistsTab();
        }
    }

    showUnauthenticatedState() {
        const libraryContent = document.querySelector(".library-content");
        if (!libraryContent) return;

        // Hide navigation tabs
        const navTabs = document.querySelectorAll(".nav-tab");
        navTabs.forEach((tab) => (tab.style.display = "none"));

        // Hide create button
        const createBtn = document.querySelector(".create-btn");
        if (createBtn) createBtn.style.display = "none";

        // Hide filter controls (search and sort)
        const searchLibraryBtn = document.querySelector(".search-library-btn");
        if (searchLibraryBtn) searchLibraryBtn.style.display = "none";

        const sortBtn = document.querySelector(".sort-btn");
        if (sortBtn) sortBtn.style.display = "none";

        // Show unauthenticated content
        libraryContent.innerHTML = `
            <div class="no-content" style="min-height: 150px;">
                <i class="fas fa-user-lock" style="font-size: 32px; margin-bottom: 16px;"></i>
                <p>Please log in to see your library</p>
            </div>
        `;
    }

    /**
     * Show elements when user is authenticated
     */
    showAuthenticatedElements() {
        // Show navigation tabs
        const navTabs = document.querySelectorAll(".nav-tab");
        navTabs.forEach((tab) => (tab.style.display = "block"));

        // Show create button
        const createBtn = document.querySelector(".create-btn");
        if (createBtn) createBtn.style.display = "block";

        // Show filter controls (search and sort)
        const searchLibraryBtn = document.querySelector(".search-library-btn");
        if (searchLibraryBtn) searchLibraryBtn.style.display = "block";

        const sortBtn = document.querySelector(".sort-btn");
        if (sortBtn) sortBtn.style.display = "block";
    }

    showPlaylistsTab() {
        const libraryContent = document.querySelector(".library-content");
        if (!libraryContent) return;

        // Show elements when authenticated
        this.showAuthenticatedElements();

        // Clear existing content
        libraryContent.innerHTML = "";

        // Add Liked Songs (always first)
        const likedSongsItem = this.createLibraryItem({
            type: "liked-songs",
            title: "Liked Songs",
            subtitle: "Playlist • Your liked tracks",
            icon: "fas fa-heart",
        });
        libraryContent.appendChild(likedSongsItem);

        // Add user playlists
        this.userPlaylists.forEach((playlist) => {
            const playlistItem = this.createLibraryItem({
                type: "playlist",
                title: playlist.name,
                subtitle: `Playlist • ${
                    playlist.description || "No description"
                }`,
                image: playlist.cover_image_url,
                id: playlist.id,
            });
            libraryContent.appendChild(playlistItem);
        });

        // If no user playlists, show placeholder
        if (this.userPlaylists.length === 0) {
            const noPlaylistsItem = this.createLibraryItem({
                type: "placeholder",
                title: "No playlists yet",
                subtitle: "Create your first playlist",
                icon: "fas fa-plus-circle",
            });
            libraryContent.appendChild(noPlaylistsItem);
        }
    }

    showArtistsTab() {
        const libraryContent = document.querySelector(".library-content");
        if (!libraryContent) return;

        // Show elements when authenticated
        this.showAuthenticatedElements();

        // Clear existing content
        libraryContent.innerHTML = "";

        // Add followed artists
        this.userArtists.forEach((artist) => {
            const artistItem = this.createLibraryItem({
                type: "artist",
                title: artist.name,
                subtitle: "Artist",
                image: artist.image_url,
                id: artist.id,
            });
            libraryContent.appendChild(artistItem);
        });

        // If no followed artists, show placeholder
        if (this.userArtists.length === 0) {
            const noArtistsItem = this.createLibraryItem({
                type: "placeholder",
                title: "No followed artists",
                subtitle: "Follow artists to see artists here",
                icon: "fas fa-user-plus",
            });
            libraryContent.appendChild(noArtistsItem);
        }
    }

    createLibraryItem(item) {
        const libraryItem = document.createElement("div");
        libraryItem.className = "library-item";
        if (item.id) {
            libraryItem.dataset.id = item.id;
        }

        let iconHtml = "";
        if (item.type === "liked-songs") {
            iconHtml = `<div class="item-icon liked-songs"><i class="${item.icon}"></i></div>`;
        } else if (item.image) {
            iconHtml = `<img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.src='./assets/images/placeholder.svg?height=48&width=48'" />`;
        } else {
            iconHtml = `<div class="item-icon"><i class="${item.icon}"></i></div>`;
        }

        libraryItem.innerHTML = `
            ${iconHtml}
            <div class="item-info">
                <div class="item-title">${this.escapeHtml(item.title)}</div>
                <div class="item-subtitle">${this.escapeHtml(
                    item.subtitle
                )}</div>
            </div>
        `;

        // Add click event
        libraryItem.addEventListener("click", () => {
            this.handleLibraryItemClick(item);
        });

        return libraryItem;
    }

    handleLibraryItemClick(item) {
        if (item.type === "liked-songs") {
            // TODO: Navigate to liked songs
            console.log("Navigate to liked songs");
        } else if (item.type === "playlist") {
            // TODO: Navigate to playlist
            console.log("Navigate to playlist:", item.id);
        } else if (item.type === "artist") {
            // TODO: Navigate to artist
            console.log("Navigate to artist:", item.id);
        }
    }

    createPlaylistCard(playlist) {
        const card = document.createElement("div");
        card.className = "hit-card";
        card.innerHTML = `
            <div class="hit-card-cover">
                <img 
                    src="${
                        playlist.cover_image_url ||
                        "./assets/images/placeholder.svg?height=160&width=160"
                    }" 
                    alt="${playlist.name}"
                    onerror="this.src='./assets/images/placeholder.svg?height=160&width=160'"
                />
                <button class="hit-play-btn" data-playlist-id="${playlist.id}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="hit-card-info">
                <h3 class="hit-card-title">${this.escapeHtml(
                    playlist.name
                )}</h3>
                <p class="hit-card-artist">${
                    playlist.description || "Playlist"
                }</p>
            </div>
        `;

        // Add click event for play button
        const playBtn = card.querySelector(".hit-play-btn");
        playBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.handlePlaylistPlay(playlist);
        });

        return card;
    }

    createArtistCard(artist) {
        const card = document.createElement("div");
        card.className = "artist-card";
        card.innerHTML = `
            <div class="artist-card-cover">
                <img 
                    src="${
                        artist.image_url ||
                        "./assets/images/placeholder.svg?height=160&width=160"
                    }" 
                    alt="${artist.name}"
                    onerror="this.src='./assets/images/placeholder.svg?height=160&width=160'"
                />
                <button class="artist-play-btn" data-artist-id="${artist.id}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="artist-card-info">
                <h3 class="artist-card-name">${this.escapeHtml(
                    artist.name
                )}</h3>
                <p class="artist-card-type">Artist</p>
            </div>
        `;

        // Add click event for play button
        const playBtn = card.querySelector(".artist-play-btn");
        playBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.handleArtistPlay(artist);
        });

        return card;
    }

    handlePlaylistPlay(playlist) {
        // TODO: Implement playlist play functionality
        console.log("Playing playlist:", playlist.name);
        showToast(`Playing playlist: ${playlist.name}`, "info");
    }

    handleArtistPlay(artist) {
        // TODO: Implement artist play functionality (e.g., play top tracks)
        console.log("Playing artist:", artist.name);
        showToast(`Playing artist: ${artist.name}`, "info");
    }

    setupEventListeners() {
        // Setup sidebar navigation
        this.setupSidebarNavigation();

        // Setup search functionality
        this.setupSearch();

        // Setup library tabs
        this.setupLibraryTabs();

        // Setup authentication event listeners
        this.setupAuthEventListeners();
    }

    setupSidebarNavigation() {
        // Create button functionality
        const createBtn = document.querySelector(".create-btn");
        if (createBtn) {
            createBtn.addEventListener("click", () => {
                showToast("Create functionality coming soon!", "info");
            });
        }

        // Library tabs
        const navTabs = document.querySelectorAll(".nav-tab");
        navTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                navTabs.forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");

                // Switch content based on tab without toast
                if (tab.textContent === "Playlists") {
                    this.showPlaylistsTab();
                } else if (tab.textContent === "Artists") {
                    this.showArtistsTab();
                }
            });
        });

        // Search library
        const searchLibraryBtn = document.querySelector(".search-library-btn");
        if (searchLibraryBtn) {
            searchLibraryBtn.addEventListener("click", () => {
                showToast("Library search coming soon!", "info");
            });
        }

        // Sort button
        const sortBtn = document.querySelector(".sort-btn");
        if (sortBtn) {
            sortBtn.addEventListener("click", () => {
                showToast("Sort functionality coming soon!", "info");
            });
        }
    }

    setupSearch() {
        const searchInput = document.querySelector(".search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    // TODO: Implement search functionality
                    console.log("Searching for:", query);
                }
            });

            searchInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    const query = e.target.value.trim();
                    if (query.length > 0) {
                        showToast(`Searching for: ${query}`, "info");
                    }
                }
            });
        }

        // Home button
        const homeBtn = document.querySelector(".home-btn");
        if (homeBtn) {
            homeBtn.addEventListener("click", () => {
                window.location.reload();
            });
        }
    }

    setupLibraryTabs() {
        const libraryItems = document.querySelectorAll(".library-item");
        libraryItems.forEach((item) => {
            item.addEventListener("click", () => {
                libraryItems.forEach((i) => i.classList.remove("active"));
                item.classList.add("active");

                // No toast when selecting library items
                const title = item.querySelector(".item-title")?.textContent;
                if (title) {
                    console.log(`Selected: ${title}`);
                }
            });
        });
    }

    // Utility function to escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to refresh data
    async refreshData() {
        try {
            await this.loadHomeData();
        } catch (error) {
            console.error("Error refreshing data:", error);
            showToast("Failed to refresh data", "error");
        }
    }

    // Method to check and refresh authentication
    async checkAuthentication() {
        const isAuthenticated = httpRequest.isAuthenticated();

        if (isAuthenticated) {
            // Reload user data
            await this.loadHomeData();
        } else {
            // Show unauthenticated state
            this.showUnauthenticatedState();
        }
    }

    // Method to handle login success
    async onLoginSuccess() {
        console.log("Login successful, refreshing user data...");
        await this.checkAuthentication();
    }

    // Method to handle logout
    onLogout() {
        console.log("Logout successful, clearing user data...");
        httpRequest.clearAuth();
        this.userPlaylists = [];
        this.userArtists = [];
        this.showUnauthenticatedState();
    }

    /**
     * Setup authentication event listeners
     */
    setupAuthEventListeners() {
        // Listen for login success
        document.addEventListener("auth:loginSuccess", async (event) => {
            console.log("Auth event: Login success", event.detail);
            await this.onLoginSuccess();
        });

        // Listen for logout
        document.addEventListener("auth:logout", (event) => {
            console.log("Auth event: Logout", event.detail);
            this.onLogout();
        });
    }
}

// Initialize home page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.homePage = new HomePage();

    // Expose authentication methods globally
    window.checkAuth = () => window.homePage.checkAuthentication();
    window.onLoginSuccess = () => window.homePage.onLoginSuccess();
    window.onLogout = () => window.homePage.onLogout();
});

export default HomePage;
