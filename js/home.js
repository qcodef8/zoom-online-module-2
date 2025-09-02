import authAPI from "./api/authentication.js";
import artistsAPI from "./api/artists.js";
import playlistsAPI from "./api/playlists.js";

import player from "./player.js";
import uploadAPI from "./api/upload.js";

import { showToast } from "./utils/toast.js";

class HomePage {
    constructor() {
        this.currentArtist = null;
        this.init();
    }

    // Check if playlist is owned by current user using in-memory list
    isPlaylistOwnedByUser(playlistId) {
        return (this.userPlaylists || []).some((p) => p.id === playlistId);
    }

    // Local play count helpers
    getLocalPlayCount(trackId) {
        if (!trackId) return 0;
        const key = `play_count_${trackId}`;
        return Number(localStorage.getItem(key)) || 0;
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
            const response = await playlistsAPI.getAllPlaylists();
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
            const response = await artistsAPI.getAllArtists();

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
            if (!authAPI.isLoggedIn()) {
                console.log("User not authenticated, skipping user playlists");
                return [];
            }

            const response = await playlistsAPI.getUserPlaylists();
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
            if (!authAPI.isLoggedIn()) {
                console.log("User not authenticated, skipping user artists");
                return [];
            }

            const response = await artistsAPI.getFollowedArtists();
            console.log("User artists API response:", response);

            let userArtists = [];
            if (response && response.data) {
                userArtists = response.data;
            } else if (Array.isArray(response)) {
                userArtists = response;
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

        playlists.forEach((playlist) => {
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

        // Render all artists returned by server
        artists.forEach((artist) => {
            const artistCard = this.createArtistCard(artist);
            artistsGrid.appendChild(artistCard);
            // Navigate to artist detail on card click (not the play button)
            artistCard.addEventListener("click", (e) => {
                const isPlayBtn = e.target.closest?.(".artist-play-btn");
                if (isPlayBtn) return; // skip, handled elsewhere
                if (artist.id) this.navigateToArtist(artist.id);
            });
        });
    }

    renderSidebarContent(userPlaylists, userArtists) {
        this.userPlaylists = userPlaylists || [];
        this.userArtists = userArtists || [];

        // Check authentication status
        const isAuthenticated = authAPI.isLoggedIn();

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

        // Context menu for artist items (Unfollow / Don't play)
        if (item.type === "artist" && item.id) {
            libraryItem.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.showArtistContextMenu(item, e);
            });
        }

        // Context menu for playlist items (Delete)
        if (item.type === "playlist" && item.id) {
            libraryItem.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.showPlaylistContextMenu(item, e);
            });
        }

        return libraryItem;
    }

    showArtistContextMenu(artistItem, event) {
        // Remove any existing menu first
        const existing = document.getElementById("artistContextMenu");
        if (existing) existing.remove();

        const menu = document.createElement("div");
        menu.id = "artistContextMenu";
        menu.style.position = "fixed";
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.minWidth = "220px";
        menu.style.background = "var(--bg-secondary)";
        menu.style.border = "1px solid var(--border-color)";
        menu.style.borderRadius = "8px";
        menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
        menu.style.zIndex = "10000";
        menu.style.padding = "6px";

        const makeItem = (iconHtml, label) => {
            const btn = document.createElement("button");
            btn.style.width = "100%";
            btn.style.display = "flex";
            btn.style.alignItems = "center";
            btn.style.gap = "12px";
            btn.style.padding = "10px 12px";
            btn.style.background = "transparent";
            btn.style.color = "var(--text-primary)";
            btn.style.border = "none";
            btn.style.borderRadius = "6px";
            btn.style.cursor = "pointer";
            btn.innerHTML = `${iconHtml}<span>${label}</span>`;
            btn.addEventListener("mouseenter", () => {
                btn.style.background = "var(--bg-tertiary)";
            });
            btn.addEventListener("mouseleave", () => {
                btn.style.background = "transparent";
            });
            return btn;
        };

        const unfollowBtn = makeItem(
            '<i class="fas fa-times" style="color:#1db954"></i>',
            "Unfollow"
        );
        unfollowBtn.addEventListener("click", async () => {
            try {
                await artistsAPI.unfollowArtist(artistItem.id);
                // Remove from in-memory list and re-render if needed
                this.userArtists = (this.userArtists || []).filter(
                    (a) => a.id !== artistItem.id
                );
                const activeTab = document
                    .querySelector(".nav-tab.active")
                    ?.textContent?.trim();
                if (activeTab === "Artists") this.showArtistsTab();
                showToast(
                    `Unfollowed ${artistItem.title || artistItem.name}`,
                    "success"
                );
            } catch (err) {
                console.error("Unfollow failed:", err);
                showToast("Failed to unfollow artist", "error");
            } finally {
                menu.remove();
            }
        });

        const blockBtn = makeItem(
            '<i class="fas fa-ban" style="color:#b3b3b3"></i>',
            "Don't play this artist"
        );
        blockBtn.addEventListener("click", () => {
            // UI only for now
            showToast("Won't play this artist (UI only)", "info");
            menu.remove();
        });

        menu.appendChild(unfollowBtn);
        menu.appendChild(blockBtn);
        document.body.appendChild(menu);

        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener("click", closeMenu, true);
                document.removeEventListener("keydown", onKey, true);
            }
        };
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                menu.remove();
                document.removeEventListener("click", closeMenu, true);
                document.removeEventListener("keydown", onKey, true);
            }
        };
        setTimeout(() => {
            document.addEventListener("click", closeMenu, true);
            document.addEventListener("keydown", onKey, true);
        }, 0);
    }

    showPlaylistContextMenu(playlistItem, event) {
        const existing = document.getElementById("playlistContextMenu");
        if (existing) existing.remove();
        const menu = document.createElement("div");
        menu.id = "playlistContextMenu";
        menu.style.position = "fixed";
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.minWidth = "200px";
        menu.style.background = "var(--bg-secondary)";
        menu.style.border = "1px solid var(--border-color)";
        menu.style.borderRadius = "8px";
        menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
        menu.style.zIndex = "10000";
        menu.style.padding = "6px";

        const btn = document.createElement("button");
        btn.style.width = "100%";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.gap = "12px";
        btn.style.padding = "10px 12px";
        btn.style.background = "transparent";
        btn.style.color = "var(--text-primary)";
        btn.style.border = "none";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";
        btn.innerHTML =
            '<i class="fas fa-trash" style="color:#e91429"></i><span>Delete playlist</span>';
        btn.addEventListener(
            "mouseenter",
            () => (btn.style.background = "var(--bg-tertiary)")
        );
        btn.addEventListener(
            "mouseleave",
            () => (btn.style.background = "transparent")
        );
        btn.onclick = async () => {
            try {
                await playlistsAPI.deletePlaylist(playlistItem.id);
                this.userPlaylists = (this.userPlaylists || []).filter(
                    (p) => p.id !== playlistItem.id
                );
                const activeTab = document
                    .querySelector(".nav-tab.active")
                    ?.textContent?.trim();
                if (activeTab === "Playlists") this.showPlaylistsTab();
                showToast("Playlist deleted", "success");
            } catch (err) {
                console.error("Delete playlist failed:", err);
                showToast("Failed to delete playlist", "error");
            } finally {
                menu.remove();
            }
        };
        menu.appendChild(btn);
        document.body.appendChild(menu);

        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener("click", closeMenu, true);
                document.removeEventListener("keydown", onKey, true);
            }
        };
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                menu.remove();
                document.removeEventListener("click", closeMenu, true);
                document.removeEventListener("keydown", onKey, true);
            }
        };
        setTimeout(() => {
            document.addEventListener("click", closeMenu, true);
            document.addEventListener("keydown", onKey, true);
        }, 0);
    }

    handleLibraryItemClick(item) {
        if (item.type === "liked-songs") {
            console.log("Navigate to liked songs");
        } else if (item.type === "playlist") {
            if (item.id) this.navigateToPlaylist(item.id);
        } else if (item.type === "artist") {
            if (item.id) this.navigateToArtist(item.id);
        }
    }

    createPlaylistCard(playlist) {
        const card = document.createElement("div");
        card.className = "hit-card";
        if (playlist.id) card.dataset.id = playlist.id;
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

        // Navigate to playlist detail when clicking the card (excluding play button)
        card.addEventListener("click", (e) => {
            const isPlay = e.target.closest?.(".hit-play-btn");
            if (isPlay) return;
            if (playlist.id) this.navigateToPlaylist(playlist.id);
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
        console.log("Playing playlist:", playlist.name);
        showToast(`Playing playlist: ${playlist.name}`, "info");
    }

    handleArtistPlay(artist) {
        console.log("Playing artist:", artist.name);
        showToast(`Playing artist: ${artist.name}`, "info");
    }

    // =============== Artist Detail ===============
    async navigateToArtist(artistId) {
        try {
            const [artist, popularTracks] = await Promise.all([
                artistsAPI.getArtist(artistId),
                artistsAPI.getArtistPopularTracks(artistId, { limit: 10 }),
            ]);
            // Some endpoints wrap in data
            this.currentArtist = artist?.data || artist;
            if (!this.currentArtist || !this.currentArtist.id) {
                throw new Error("Artist not found");
            }
            this.renderArtistDetail(this.currentArtist);
            // API returns an object: { tracks: [...], artist: {...}, pagination: {...} }
            const tracks =
                popularTracks?.data?.tracks ||
                popularTracks?.tracks ||
                (Array.isArray(popularTracks) ? popularTracks : []);
            this.renderArtistPopularTracks(tracks);
        } catch (error) {
            console.error("Failed to load artist details:", error);
            showToast("Failed to load artist details", "error");
        }
    }

    // =============== Playlist Detail ===============
    async navigateToPlaylist(playlistId) {
        try {
            const response = await playlistsAPI.getPlaylist(playlistId);
            const playlist = response?.data || response;
            if (!playlist || !playlist.id)
                throw new Error("Playlist not found");
            this.currentPlaylist = playlist;
            this.renderPlaylistDetail(playlist);
        } catch (error) {
            console.error("Failed to load playlist details:", error);
            showToast("Failed to load playlist", "error");
        }
    }

    renderPlaylistDetail(playlist) {
        // Show playlist sections, hide artist sections and home
        const playlistHero = document.querySelector(".playlist-hero");
        const playlistTools = document.querySelector(".playlist-tools");
        const artistHero = document.querySelector(".artist-hero");
        const artistControls = document.querySelector(".artist-controls");
        const popularSection = document.querySelector(".popular-section");
        const hits = document.querySelector(".hits-section");
        const artists = document.querySelector(".artists-section");
        if (playlistHero) playlistHero.style.display = "block";
        if (playlistTools) playlistTools.style.display = "block";
        if (artistHero) artistHero.style.display = "none";
        if (artistControls) artistControls.style.display = "none";
        if (popularSection) popularSection.style.display = "none";
        if (hits) hits.style.display = "none";
        if (artists) artists.style.display = "none";

        // Fill info
        const nameEl = document.getElementById("playlistNameDisplay");
        const ownerEl = document.getElementById("playlistOwner");
        const coverEl = document.getElementById("playlistCover");
        if (nameEl) nameEl.textContent = playlist.name || "My Playlist";
        if (ownerEl)
            ownerEl.textContent = playlist.owner_name || playlist.owner || "";
        if (coverEl) {
            if (playlist.cover_image_url) {
                coverEl.style.backgroundImage = `url('${playlist.cover_image_url}')`;
                coverEl.style.backgroundSize = "cover";
                coverEl.style.backgroundPosition = "center";
            } else {
                coverEl.style.backgroundImage = "none";
            }
            coverEl.style.backgroundSize = "cover";
            coverEl.style.backgroundPosition = "center";
        }

        // Click name or cover to open edit modal
        const canEdit = this.isPlaylistOwnedByUser(playlist.id);
        const openEdit = () => {
            if (!canEdit) return;
            this.openEditPlaylistModal(playlist);
        };
        if (nameEl) {
            nameEl.onclick = openEdit;
            nameEl.style.cursor = canEdit ? "pointer" : "default";
        }
        if (coverEl) {
            coverEl.onclick = openEdit;
            coverEl.style.cursor = canEdit ? "pointer" : "default";
            coverEl.classList.toggle("clickable", canEdit);
            coverEl.setAttribute("role", "button");
            coverEl.setAttribute("tabindex", canEdit ? "0" : "-1");
            coverEl.onkeydown = (e) => {
                if (!canEdit) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit();
                }
            };
        }

        // Wire search input (client-side filter placeholder)
        const search = document.getElementById("playlistSearch");
        if (search) {
            search.value = "";
            search.oninput = (e) => {
                const q = e.target.value.trim().toLowerCase();
                console.log("Filter playlist tracks by:", q);
            };
        }
    }

    openEditPlaylistModal(playlist) {
        if (!this.isPlaylistOwnedByUser(playlist.id)) return;
        const modal = document.getElementById("editPlaylistModal");
        const closeBtn = document.getElementById("editPlaylistClose");
        const saveBtn = document.getElementById("editPlaylistSave");
        const nameInput = document.getElementById("editPlaylistName");
        const descInput = document.getElementById("editPlaylistDescription");
        const imageBox = document.getElementById("editPlaylistImage");
        const fileInput = document.getElementById("editPlaylistFile");
        if (!modal || !saveBtn || !nameInput || !descInput || !imageBox) return;

        nameInput.value = playlist.name || "";
        descInput.value = playlist.description || "";
        modal.style.display = "flex";

        const onClose = () => {
            modal.style.display = "none";
            cleanup();
        };
        const cleanup = () => {
            if (closeBtn) closeBtn.onclick = null;
            saveBtn.onclick = null;
            imageBox.onclick = null;
        };
        if (closeBtn) closeBtn.onclick = onClose;

        imageBox.onclick = () => {
            if (fileInput) fileInput.click();
        };

        let uploadedImagePath = null;
        if (fileInput) {
            fileInput.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                    const data = await uploadAPI.uploadImage(file);
                    if (data?.path) {
                        uploadedImagePath = data.path;
                        imageBox.style.backgroundImage = `url('${data.path}')`;
                        imageBox.style.backgroundSize = "cover";
                        imageBox.style.backgroundPosition = "center";
                        showToast("Image uploaded", "success");
                    } else {
                        showToast("Upload failed", "error");
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                    showToast("Upload failed", "error");
                }
            };
        }

        saveBtn.onclick = async () => {
            try {
                const payload = {
                    name: nameInput.value?.trim() || playlist.name,
                    description:
                        descInput.value?.trim() || playlist.description,
                };
                if (uploadedImagePath) {
                    payload.cover_image_url = uploadedImagePath;
                }

                const res = await playlistsAPI.updatePlaylist(
                    playlist.id,
                    payload
                );
                const serverUpdated = res?.data?.playlist || res?.data || res;
                const updated =
                    serverUpdated && typeof serverUpdated === "object"
                        ? serverUpdated
                        : {};
                const merged = { ...playlist, ...payload, ...updated };
                this.currentPlaylist = merged;
                this.renderPlaylistDetail(this.currentPlaylist);

                // Update sidebar data and re-render Playlists tab if active
                this.userPlaylists = (this.userPlaylists || []).map((p) =>
                    p.id === playlist.id ? { ...p, ...merged } : p
                );
                // Update sidebar DOM title/image in-place
                const sidebarItem = document.querySelector(
                    `.library-item[data-id="${playlist.id}"]`
                );
                if (sidebarItem) {
                    const titleEl = sidebarItem.querySelector(".item-title");
                    if (titleEl && merged.name)
                        titleEl.textContent = merged.name;
                    const imgEl = sidebarItem.querySelector(".item-image");
                    if (imgEl && merged.cover_image_url)
                        imgEl.src = merged.cover_image_url;
                }
                const activeTab = document
                    .querySelector(".nav-tab.active")
                    ?.textContent?.trim();
                if (activeTab === "Playlists") this.showPlaylistsTab();
                // Also update any playlist card on Home grid
                const card = document.querySelector(
                    `.hit-card[data-id="${playlist.id}"]`
                );
                if (card) {
                    const img = card.querySelector(".hit-card-cover img");
                    const title = card.querySelector(".hit-card-title");
                    const desc = card.querySelector(".hit-card-artist");
                    if (img && merged.cover_image_url) {
                        img.src =
                            merged.cover_image_url ||
                            "./assets/images/placeholder.svg?height=160&width=160";
                    }
                    if (title && merged.name) title.textContent = merged.name;
                    if (desc)
                        desc.textContent =
                            merged.description || desc.textContent || "";
                }

                showToast("Playlist updated", "success");
                onClose();
            } catch (err) {
                console.error("Update playlist failed:", err);
                showToast("Failed to update playlist", "error");
            }
        };
    }

    showArtistSections() {
        const hero = document.querySelector(".artist-hero");
        const controls = document.querySelector(".artist-controls");
        const popular = document.querySelector(".popular-section");
        if (hero) hero.style.display = "block";
        if (controls) controls.style.display = "flex";
        if (popular) popular.style.display = "block";
        // Hide home sections
        const hits = document.querySelector(".hits-section");
        const popularArtists = document.querySelector(".artists-section");
        if (hits) hits.style.display = "none";
        if (popularArtists) popularArtists.style.display = "none";
    }

    showHomeSections() {
        const hero = document.querySelector(".artist-hero");
        const controls = document.querySelector(".artist-controls");
        const popular = document.querySelector(".popular-section");
        if (hero) hero.style.display = "none";
        if (controls) controls.style.display = "none";
        if (popular) popular.style.display = "none";
        const hits = document.querySelector(".hits-section");
        const popularArtists = document.querySelector(".artists-section");
        if (hits) hits.style.display = "block";
        if (popularArtists) popularArtists.style.display = "block";
    }

    formatNumber(num) {
        try {
            return new Intl.NumberFormat().format(num);
        } catch {
            return `${num}`;
        }
    }

    formatDuration(value) {
        if (!value && value !== 0) return "";
        let totalMs = Number(value);
        if (isNaN(totalMs)) return "";
        // Heuristic: treat values < 1000*60 as seconds, otherwise ms
        if (totalMs < 1000 * 60) totalMs = totalMs * 1000;
        const totalSec = Math.floor(totalMs / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    renderArtistDetail(artist) {
        // Hero background and content
        const hero = document.querySelector(".artist-hero");
        const heroImg = document.querySelector(".artist-hero .hero-image");
        const nameEl = document.querySelector(".artist-hero .artist-name");
        const listenersEl = document.querySelector(
            ".artist-hero .monthly-listeners"
        );
        const verified = document.querySelector(".artist-hero .verified-badge");

        if (heroImg) {
            heroImg.src =
                artist.background_image_url ||
                artist.image_url ||
                "./assets/images/placeholder.svg";
        }
        if (nameEl) nameEl.textContent = artist.name || "Unknown";
        if (listenersEl)
            listenersEl.textContent = `${this.formatNumber(
                artist.monthly_listeners || 0
            )} monthly listeners`;
        if (verified)
            verified.style.display = artist.is_verified ? "flex" : "none";

        // Follow button
        const followBtn = document.getElementById("artistFollowBtn");
        if (followBtn) {
            const setFollowing = (isFollowing) => {
                followBtn.classList.toggle("following", !!isFollowing);
                followBtn.querySelector("span").textContent = isFollowing
                    ? "Following"
                    : "Follow";
                const icon = followBtn.querySelector("i");
                if (icon)
                    icon.className = isFollowing
                        ? "fas fa-user-check"
                        : "fas fa-user-plus";
            };

            // Assume not following by default (no endpoint yet to check)
            setFollowing(!!artist.is_following);

            followBtn.onclick = async () => {
                if (!authAPI.isLoggedIn()) {
                    showToast("Please log in to follow artists", "error");
                    return;
                }
                try {
                    const res = await artistsAPI.followArtist(artist.id);
                    const data = res?.data || res;
                    const isFollowing = data?.is_following ?? true;
                    setFollowing(isFollowing);
                    showToast(
                        isFollowing ? "Followed artist" : "Unfollowed artist",
                        "success"
                    );

                    // Update sidebar list immediately
                    this.userArtists = Array.isArray(this.userArtists)
                        ? this.userArtists
                        : [];
                    if (isFollowing) {
                        const exists = this.userArtists.some(
                            (a) => a.id === artist.id
                        );
                        if (!exists) {
                            this.userArtists.unshift({
                                id: artist.id,
                                name: artist.name,
                                image_url:
                                    artist.image_url ||
                                    artist.background_image_url,
                            });
                        }
                    } else {
                        this.userArtists = this.userArtists.filter(
                            (a) => a.id !== artist.id
                        );
                    }

                    // Re-render sidebar if Artists tab is active
                    const activeTab = document
                        .querySelector(".nav-tab.active")
                        ?.textContent?.trim();
                    if (activeTab === "Artists") {
                        this.showArtistsTab();
                    }
                } catch (e) {
                    console.error("Follow artist failed:", e);
                    showToast("Action failed. Please try again.", "error");
                }
            };
        }

        this.showArtistSections();
    }

    renderArtistPopularTracks(tracks) {
        const section = document.querySelector(".popular-section");
        if (!section) return;
        const list = section.querySelector(".track-list");
        if (!list) return;

        // Clear existing items
        list.innerHTML = "";

        const safeTracks = Array.isArray(tracks) ? tracks : [];
        if (safeTracks.length === 0) {
            list.innerHTML = `
                <div class="no-content" style="min-height: 120px;">
                    <i class="fas fa-music" style="font-size: 28px; margin-bottom: 12px;"></i>
                    <p>No popular tracks</p>
                </div>
            `;
            return;
        }

        safeTracks.forEach((track, idx) => {
            const item = document.createElement("div");
            item.className = "track-item";
            if (track.id) item.dataset.trackId = track.id;
            const apiPlays =
                track.play_count || track.plays || track.playCount || 0;
            const duration = this.formatDuration(
                track.duration_ms ?? track.durationMs ?? track.duration
            );
            const img =
                track.image_url ||
                track.cover_image_url ||
                (track.album &&
                    (track.album.cover_image_url || track.album.image_url)) ||
                "./assets/images/placeholder.svg?height=40&width=40";

            item.innerHTML = `
                <div class="track-number">${idx + 1}</div>
                <div class="track-image">
                    <img src="${img}" alt="${this.escapeHtml(
                track.title || track.name || "Track"
            )}" onerror="this.src='./assets/images/placeholder.svg?height=40&width=40'" />
                </div>
                <div class="track-info">
                    <div class="track-name">${this.escapeHtml(
                        track.title || track.name || "Untitled"
                    )}</div>
                </div>
                <div class="track-plays" data-api-plays="${apiPlays}">${this.formatNumber(
                apiPlays + this.getLocalPlayCount(track.id)
            )}</div>
                <div class="track-duration">${duration}</div>
                <button class="track-menu-btn"><i class="fas fa-ellipsis-h"></i></button>
            `;

            // Add click-to-play behavior within current artist context
            item.addEventListener("click", () => {
                const artistContext = {
                    id: this.currentArtist?.id,
                    name: this.currentArtist?.name,
                    image_url:
                        this.currentArtist?.image_url ||
                        this.currentArtist?.background_image_url,
                };
                player.loadQueue(safeTracks, idx, artistContext);
            });

            list.appendChild(item);
        });

        // Wire the big play button to play the first track of this artist
        const bigPlayBtn = document.querySelector(
            ".artist-controls .play-btn-large"
        );
        if (bigPlayBtn) {
            bigPlayBtn.onclick = () => {
                if (safeTracks.length === 0) return;
                const artistContext = {
                    id: this.currentArtist?.id,
                    name: this.currentArtist?.name,
                    image_url:
                        this.currentArtist?.image_url ||
                        this.currentArtist?.background_image_url,
                };
                player.loadQueue(safeTracks, 0, artistContext);
            };
        }
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

        // Update play_count in UI from localStorage when a track starts
        document.addEventListener("player:trackStart", (e) => {
            const track = e.detail?.track;
            if (!track?.id) return;
            const row = document.querySelector(
                `.popular-section .track-item[data-track-id="${track.id}"]`
            );
            if (!row) return;
            const playsEl = row.querySelector(".track-plays");
            if (!playsEl) return;
            const apiBase = Number(playsEl.dataset.apiPlays || 0);
            const local = this.getLocalPlayCount(track.id);
            playsEl.textContent = this.formatNumber(apiBase + local);
        });
    }

    setupSidebarNavigation() {
        // Create button functionality
        const createBtn = document.querySelector(".create-btn");
        if (createBtn) {
            createBtn.addEventListener("click", async () => {
                // Ask for playlist name
                let name = prompt("Playlist name", "My Playlist");
                if (name === null) return; // cancelled
                name = name.trim();
                if (!name) name = "My Playlist";

                // Optional description
                const description = "Created from sidebar";

                try {
                    const res = await playlistsAPI.createPlaylist({
                        name,
                        description,
                        is_public: true,
                    });

                    const data = res?.data || res;
                    const playlist = data?.playlist || data;
                    if (!playlist?.id) {
                        showToast("Failed to create playlist", "error");
                        return;
                    }

                    // Maintain in-memory list and re-render if Playlists tab is active
                    this.userPlaylists = Array.isArray(this.userPlaylists)
                        ? this.userPlaylists
                        : [];
                    this.userPlaylists.unshift(playlist);

                    const activeTab = document
                        .querySelector(".nav-tab.active")
                        ?.textContent?.trim();
                    if (activeTab === "Playlists") this.showPlaylistsTab();

                    showToast(`Created playlist: ${name}`, "success");
                } catch (error) {
                    console.error("Create playlist failed:", error);
                    if (error?.statusCode === 401) {
                        showToast("Please log in to create playlists", "error");
                    } else {
                        showToast("Failed to create playlist", "error");
                    }
                }
            });
        }

        // Sidebar logo navigates to Home (same as header Home button)
        const sidebarLogo = document.querySelector(".sidebar .logo");
        if (sidebarLogo) {
            sidebarLogo.addEventListener("click", () => {
                window.location.reload();
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

        // Sort button
        this.setupSortDropdown();
    }

    setupSearch() {
        const searchInput = document.querySelector(".search-input");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const query = e.target.value.trim();
                if (query.length > 0) {
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

        // Sidebar library quick search (slide-out)
        const libSearchBtn = document.getElementById("librarySearchBtn");
        const libSearchInput = document.getElementById("librarySearchInput");
        const libSearchContainer = document.getElementById("librarySearch");
        if (libSearchBtn && libSearchInput && libSearchContainer) {
            libSearchBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                libSearchInput.classList.toggle("show");
                libSearchContainer.classList.toggle(
                    "input-open",
                    libSearchInput.classList.contains("show")
                );
                if (libSearchInput.classList.contains("show")) {
                    setTimeout(() => libSearchInput.focus(), 50);
                }
            });

            const doFilter = (term) => {
                const activeTab = document
                    .querySelector(".nav-tab.active")
                    ?.textContent?.trim();
                const q = term.toLowerCase();
                const libraryContent =
                    document.querySelector(".library-content");
                if (!libraryContent) return;

                // Build dataset from current in-memory lists
                let items = [];
                if (activeTab === "Artists") {
                    items = this.userArtists.map((a) => ({
                        type: "artist",
                        title: a.name,
                        subtitle: "Artist",
                        image: a.image_url,
                        id: a.id,
                    }));
                } else {
                    // Default to playlists
                    items = [
                        {
                            type: "liked-songs",
                            title: "Liked Songs",
                            subtitle: "Playlist • Your liked tracks",
                            icon: "fas fa-heart",
                        },
                        ...this.userPlaylists.map((p) => ({
                            type: "playlist",
                            title: p.name,
                            subtitle: `Playlist • ${
                                p.description || "No description"
                            }`,
                            image: p.cover_image_url,
                            id: p.id,
                        })),
                    ];
                }

                if (q.length === 0) {
                    // Reset content
                    if (activeTab === "Artists") this.showArtistsTab();
                    else this.showPlaylistsTab();
                    return;
                }

                const filtered = items.filter((it) =>
                    it.title?.toLowerCase().includes(q)
                );

                libraryContent.innerHTML = "";
                filtered.forEach((it) => {
                    libraryContent.appendChild(this.createLibraryItem(it));
                });

                if (filtered.length === 0) {
                    libraryContent.innerHTML = `
                        <div class="no-content" style="min-height: 120px;">
                            <i class="fas fa-search" style="font-size: 28px; margin-bottom: 12px;"></i>
                            <p>No results found</p>
                        </div>
                    `;
                }
            };

            libSearchInput.addEventListener("input", (e) => {
                doFilter(e.target.value.trim());
            });

            // Close search on outside click
            document.addEventListener("click", (e) => {
                if (!libSearchInput.classList.contains("show")) return;
                const container = document.getElementById("librarySearch");
                if (container && !container.contains(e.target)) {
                    libSearchInput.classList.remove("show");
                    libSearchContainer.classList.remove("input-open");
                    libSearchInput.value = "";
                    // Reset list
                    const activeTab = document
                        .querySelector(".nav-tab.active")
                        ?.textContent?.trim();
                    if (activeTab === "Artists") this.showArtistsTab();
                    else this.showPlaylistsTab();
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

    setupSortDropdown() {
        const toggle = document.getElementById("sortToggle");
        const dropdown = document.getElementById("sortDropdown");
        const label = document.querySelector(".sort-label");
        if (!toggle || !dropdown || !label) return;

        const closeDropdown = () => {
            dropdown.classList.remove("show");
            dropdown.setAttribute("aria-hidden", "true");
        };

        const openDropdown = () => {
            dropdown.classList.add("show");
            dropdown.setAttribute("aria-hidden", "false");
        };

        toggle.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.contains("show")
                ? closeDropdown()
                : openDropdown();
        });

        // Select sort option
        dropdown.querySelectorAll(".sort-option").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown
                    .querySelectorAll(".sort-option")
                    .forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                const value = btn.dataset.value;
                label.textContent = btn.querySelector("span").textContent;
                closeDropdown();
            });
        });

        // View as toggle buttons
        dropdown.querySelectorAll(".view-as-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown
                    .querySelectorAll(".view-as-btn")
                    .forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });

        // Close on outside click or Escape
        document.addEventListener("click", (e) => {
            if (!dropdown.classList.contains("show")) return;
            const container = document.querySelector(".sort-menu");
            if (container && !container.contains(e.target)) {
                closeDropdown();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeDropdown();
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
        const isAuthenticated = authAPI.isLoggedIn();

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
        // Clear tokens via auth API
        authAPI.removeTokens();
        // Clear local playback counts
        Object.keys(localStorage)
            .filter((k) => k.startsWith("play_count_"))
            .forEach((k) => localStorage.removeItem(k));
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
