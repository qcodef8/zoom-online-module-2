class Player {
    constructor() {
        this.audio = new Audio();
        this.queue = [];
        this.currentIndex = -1;
        this.isShuffle = false;
        this.repeat = false; // repeat all (or one if only one track)
        this.shuffleOrder = [];
        this.contextArtist = null; // { id, name, image_url }
        this.isUiEnabled = false;

        this.cacheDom();
        this.bindAudioEvents();
        this.bindUiEvents();
        this.applyInitialVolume();
        this.setUiEnabled(false);
        this.updatePlayButton(false);
        this.updateMetaVisibility(false);
        this.resetProgressUi();
    }

    cacheDom() {
        this.$title = document.querySelector(".player-title");
        this.$artist = document.querySelector(".player-artist");
        this.$image = document.querySelector(".player-image");
        this.$playBtn = document.querySelector(".play-btn");
        const controlBtns = document.querySelectorAll(
            ".player-controls .control-btn"
        );
        // Expected order: shuffle, prev, play, next, repeat
        this.$shuffleBtn = controlBtns[0];
        this.$prevBtn = controlBtns[1];
        this.$nextBtn = controlBtns[3];
        this.$repeatBtn = controlBtns[4];
        this.$progressBar = document.querySelector(".progress-bar");
        this.$progressFill = document.querySelector(".progress-fill");
        this.$timeStart = document.querySelector(
            ".progress-container .time:first-child"
        );
        this.$timeEnd = document.querySelector(
            ".progress-container .time:last-child"
        );
        // Volume
        this.$volumeSection = document.querySelector(".volume-container");
        this.$volumeBtn = this.$volumeSection?.querySelector(".control-btn");
        this.$volumeBar = this.$volumeSection?.querySelector(".volume-bar");
        this.$volumeFill = this.$volumeSection?.querySelector(".volume-fill");
    }

    bindAudioEvents() {
        this.audio.addEventListener("timeupdate", () => {
            this.updateProgress();
        });
        this.audio.addEventListener("ended", () => {
            this.onEnded();
        });
        this.audio.addEventListener("loadedmetadata", () => {
            this.updateDurations();
        });
    }

    bindUiEvents() {
        if (this.$playBtn) {
            this.$playBtn.addEventListener("click", () => this.togglePlay());
        }
        if (this.$nextBtn) {
            this.$nextBtn.addEventListener("click", () => this.next());
        }
        if (this.$prevBtn) {
            this.$prevBtn.addEventListener("click", () => this.previous());
        }
        if (this.$shuffleBtn) {
            this.$shuffleBtn.addEventListener("click", () => {
                if (!this.isUiEnabled) return;
                this.isShuffle = !this.isShuffle;
                this.$shuffleBtn.classList.toggle("active", this.isShuffle);
                this.$shuffleBtn.setAttribute(
                    "data-tooltip",
                    this.isShuffle ? "Disable shuffle" : "Enable shuffle"
                );
                if (this.isShuffle) this.buildShuffleOrder(this.currentIndex);
            });
        }
        if (this.$repeatBtn) {
            this.$repeatBtn.addEventListener("click", () => {
                if (!this.isUiEnabled) return;
                this.repeat = !this.repeat;
                this.$repeatBtn.classList.toggle("active", this.repeat);
                this.$repeatBtn.setAttribute(
                    "data-tooltip",
                    this.repeat ? "Disable repeat" : "Enable repeat"
                );
            });
        }
        if (this.$progressBar) {
            // Click to seek
            this.$progressBar.addEventListener("click", (e) => {
                if (!this.isUiEnabled) return;
                const rect = this.$progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (this.audio.duration)
                    this.audio.currentTime = percent * this.audio.duration;
            });
        }
        // Volume interactions
        if (this.$volumeBtn) {
            this.$volumeBtn.addEventListener("click", () => {
                if (!this.isUiEnabled) return;
                this.audio.muted = !this.audio.muted;
                this.updateVolumeIcon();
            });
        }
        if (this.$volumeBar) {
            const setFromEvent = (clientX) => {
                const rect = this.$volumeBar.getBoundingClientRect();
                const percent = Math.min(
                    1,
                    Math.max(0, (clientX - rect.left) / rect.width)
                );
                this.setVolume(percent);
            };
            let dragging = false;
            this.$volumeBar.addEventListener("mousedown", (e) => {
                if (!this.isUiEnabled) return;
                dragging = true;
                setFromEvent(e.clientX);
                e.preventDefault();
            });
            document.addEventListener("mousemove", (e) => {
                if (dragging) setFromEvent(e.clientX);
            });
            document.addEventListener("mouseup", () => {
                dragging = false;
            });
            // Click set
            this.$volumeBar.addEventListener("click", (e) => {
                if (!this.isUiEnabled) return;
                setFromEvent(e.clientX);
            });
        }
    }

    applyInitialVolume() {
        const stored = Number(localStorage.getItem("player_volume"));
        let vol = 0.7;
        if (!isNaN(stored)) vol = Math.min(1, Math.max(0, stored));
        this.setVolume(vol, true);
    }

    setVolume(value, skipStore = false) {
        this.audio.volume = value;
        if (value > 0 && this.audio.muted) {
            this.audio.muted = false;
        }
        if (!skipStore) localStorage.setItem("player_volume", String(value));
        if (this.$volumeFill) this.$volumeFill.style.width = `${value * 100}%`;
        if (this.$volumeBar)
            this.$volumeBar.style.setProperty("--progress", `${value * 100}%`);
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        if (!this.$volumeBtn) return;
        const icon = this.$volumeBtn.querySelector("i");
        if (!icon) return;
        if (this.audio.muted || this.audio.volume === 0) {
            icon.className = "fas fa-volume-mute";
            this.$volumeBtn.setAttribute("data-tooltip", "Unmute");
        } else if (this.audio.volume > 0.5) {
            icon.className = "fas fa-volume-up";
            this.$volumeBtn.setAttribute("data-tooltip", "Volume");
        } else {
            icon.className = "fas fa-volume-down";
            this.$volumeBtn.setAttribute("data-tooltip", "Volume");
        }
    }

    setUiEnabled(enabled) {
        this.isUiEnabled = enabled;
        const buttons = [
            this.$shuffleBtn,
            this.$prevBtn,
            this.$playBtn,
            this.$nextBtn,
            this.$repeatBtn,
            this.$volumeBtn,
        ].filter(Boolean);
        buttons.forEach((btn) => {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? "1" : "0.5";
            btn.style.pointerEvents = enabled ? "auto" : "none";
        });
        // Progress bar remains interactive even when disabled
        if (this.$progressBar) {
            this.$progressBar.style.opacity = enabled ? "1" : "0.5";
            // keep pointerEvents enabled to allow seeking even before play
            this.$progressBar.style.pointerEvents = "auto";
        }
        if (this.$volumeBar) {
            this.$volumeBar.style.opacity = enabled ? "1" : "0.5";
            this.$volumeBar.style.pointerEvents = enabled ? "auto" : "none";
        }
        this.updateMetaVisibility(enabled);
        // Hide track image and add-to-library when not enabled
        const addBtn = document.querySelector(".add-btn");
        if (addBtn) addBtn.style.visibility = enabled ? "visible" : "hidden";
        if (this.$image)
            this.$image.style.visibility = enabled ? "visible" : "hidden";
        // Disable lyrics and fullscreen when not enabled
        const controlsRight = document.querySelectorAll(
            ".player-right .control-btn"
        );
        const lyricsBtn = controlsRight[0];
        const fullScreenBtn = controlsRight[2];
        if (lyricsBtn) {
            lyricsBtn.disabled = !enabled;
            lyricsBtn.style.opacity = enabled ? "1" : "0.5";
            lyricsBtn.style.pointerEvents = enabled ? "auto" : "none";
        }
        if (fullScreenBtn) {
            fullScreenBtn.disabled = true; // always disabled as required
            fullScreenBtn.style.opacity = "0.5";
            fullScreenBtn.style.pointerEvents = "none";
        }
    }

    updateMetaVisibility(visible) {
        if (this.$title)
            this.$title.style.visibility = visible ? "visible" : "hidden";
        if (this.$artist)
            this.$artist.style.visibility = visible ? "visible" : "hidden";
    }

    loadQueue(tracks, startIndex = 0, contextArtist = null) {
        this.queue = Array.isArray(tracks) ? tracks : [];
        this.contextArtist = contextArtist;
        if (this.isShuffle) this.buildShuffleOrder(startIndex);
        this.setUiEnabled(this.queue.length > 0);
        this.playIndex(startIndex);
    }

    buildShuffleOrder(seedIndex = 0) {
        this.shuffleOrder = this.queue.map((_, i) => i);
        // Fisher–Yates shuffle
        for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffleOrder[i], this.shuffleOrder[j]] = [
                this.shuffleOrder[j],
                this.shuffleOrder[i],
            ];
        }
        // Move seed to front so the current song matches
        const pos = this.shuffleOrder.indexOf(seedIndex);
        if (pos > 0) {
            this.shuffleOrder.splice(pos, 1);
            this.shuffleOrder.unshift(seedIndex);
        }
    }

    getNextIndex() {
        if (this.queue.length === 0) return -1;
        if (!this.isShuffle) {
            return (this.currentIndex + 1) % this.queue.length;
        }
        const currentPos = this.shuffleOrder.indexOf(this.currentIndex);
        const nextPos = (currentPos + 1) % this.shuffleOrder.length;
        return this.shuffleOrder[nextPos];
    }

    getPrevIndex() {
        if (this.queue.length === 0) return -1;
        if (!this.isShuffle) {
            return (
                (this.currentIndex - 1 + this.queue.length) % this.queue.length
            );
        }
        const currentPos = this.shuffleOrder.indexOf(this.currentIndex);
        const prevPos =
            (currentPos - 1 + this.shuffleOrder.length) %
            this.shuffleOrder.length;
        return this.shuffleOrder[prevPos];
    }

    playIndex(index) {
        if (index < 0 || index >= this.queue.length) return;
        this.currentIndex = index;
        const track = this.queue[index];
        const src = track.audio_url || track.audioUrl || track.url;
        if (!src) return;
        this.audio.src = src;
        this.audio.play();
        this.updateUiForTrack(track);
        this.updatePlayButton(true);
        this.setUiEnabled(true);
        this.incrementLocalPlayCount(track);
        // Notify listeners (e.g., UI to update counts)
        document.dispatchEvent(
            new CustomEvent("player:trackStart", { detail: { track } })
        );
    }

    play() {
        this.audio.play();
        this.updatePlayButton(true);
    }

    pause() {
        this.audio.pause();
        this.updatePlayButton(false);
    }

    togglePlay() {
        if (!this.isUiEnabled) return;
        if (this.audio.paused) this.play();
        else this.pause();
    }

    next() {
        if (!this.isUiEnabled) return;
        if (this.queue.length === 0) return;
        if (this.queue.length === 1) {
            if (this.repeat) this.playIndex(this.currentIndex);
            return;
        }
        const nextIndex = this.getNextIndex();
        if (nextIndex !== -1) this.playIndex(nextIndex);
    }

    previous() {
        if (!this.isUiEnabled) return;
        if (this.queue.length === 0) return;
        if (this.queue.length === 1) {
            if (this.repeat) this.playIndex(this.currentIndex);
            return;
        }
        const prevIndex = this.getPrevIndex();
        if (prevIndex !== -1) this.playIndex(prevIndex);
    }

    onEnded() {
        if (this.queue.length <= 1) {
            if (this.repeat) this.playIndex(this.currentIndex);
            else this.updatePlayButton(false);
            return;
        }
        if (this.repeat) {
            this.next();
        } else {
            // If not last, go next; if last, stop
            const isLast = !this.isShuffle
                ? this.currentIndex === this.queue.length - 1
                : this.shuffleOrder.indexOf(this.currentIndex) ===
                  this.shuffleOrder.length - 1;
            if (isLast) this.updatePlayButton(false);
            else this.next();
        }
    }

    updateUiForTrack(track) {
        if (this.$title)
            this.$title.textContent = track.title || track.name || "";
        if (this.$artist)
            this.$artist.textContent =
                this.contextArtist?.name || track.artist || "";
        if (this.$image) {
            const img =
                track.image_url ||
                track.cover_image_url ||
                this.contextArtist?.image_url ||
                "./assets/images/placeholder.svg?height=56&width=56";
            this.$image.src = img;
        }
        this.updateMetaVisibility(true);
        this.updateDurations();
    }

    updateDurations() {
        if (this.$timeStart)
            this.$timeStart.textContent = this.formatTime(
                this.audio.currentTime
            );
        if (this.$timeEnd)
            this.$timeEnd.textContent = this.formatTime(this.audio.duration);
    }

    updateProgress() {
        const duration = this.audio.duration || 0;
        const current = this.audio.currentTime || 0;
        const percent = duration
            ? Math.min(100, (current / duration) * 100)
            : 0;
        if (this.$progressFill) this.$progressFill.style.width = `${percent}%`;
        if (this.$progressBar)
            this.$progressBar.style.setProperty("--progress", `${percent}%`);
        if (this.$timeStart)
            this.$timeStart.textContent = this.formatTime(current);
        if (this.$timeEnd)
            this.$timeEnd.textContent = this.formatTime(duration);
    }

    resetProgressUi() {
        if (this.$progressFill) this.$progressFill.style.width = `0%`;
        if (this.$progressBar)
            this.$progressBar.style.setProperty("--progress", `0%`);
        if (this.$timeStart) this.$timeStart.textContent = "-:--";
        if (this.$timeEnd) this.$timeEnd.textContent = "-:--";
    }

    updatePlayButton(isPlaying) {
        if (!this.$playBtn) return;
        const icon = this.$playBtn.querySelector("i");
        if (!icon) return;
        icon.className = isPlaying ? "fas fa-pause" : "fas fa-play";
        this.$playBtn.setAttribute(
            "data-tooltip",
            isPlaying ? "Pause" : "Play"
        );
    }

    incrementLocalPlayCount(track) {
        const id = track.id || track.uuid || track._id;
        if (!id) return;
        const key = `play_count_${id}`;
        const current = Number(localStorage.getItem(key)) || 0;
        localStorage.setItem(key, String(current + 1));
    }

    formatTime(seconds) {
        if (!isFinite(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }
}

const player = new Player();
export default player;
