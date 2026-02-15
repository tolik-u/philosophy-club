const { createApp, ref, computed } = Vue;

const app = createApp({
  template: `
    <div class="app-container">
      <!-- Login Page -->
      <div v-if="!isLoggedIn" class="login-page">
        <article class="login-card">
          <h1>Philosophy Club</h1>
          <p>A gentlemen's circle for fine spirits and refined conversation</p>

          <button class="btn-google-signin" @click="signInWithGoogle">
            <svg viewBox="0 0 24 24" width="20" height="20" style="margin-right: 10px;">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </article>
      </div>

      <!-- Main Page (after login) -->
      <div v-else class="main-page">
        <nav>
          <ul>
            <li><strong>Philosophy Club</strong></li>
          </ul>

          <div class="countdown-display">
            <div class="countdown-label">Next gathering</div>
            <div class="countdown-time">
              {{ String(countdownHours).padStart(2, '0') }}:{{ String(countdownMinutes).padStart(2, '0') }}:{{ String(countdownSeconds).padStart(2, '0') }}
            </div>
          </div>

          <ul>
            <li class="user-info-nav">
              <div><strong>{{ userName || 'Guest' }}</strong></div>
              <div class="email-small">{{ userEmail }}</div>
            </li>
            <li v-if="userRole === 'admin' || userRole === 'superadmin'"><button @click="goToAdminPanel" class="btn-admin">Admin Panel</button></li>
            <li><button @click="logout" class="btn-logout">Logout</button></li>
          </ul>
        </nav>

        <main class="container">
          <!-- Tab Bar -->
          <div class="tab-bar">
            <button :class="['tab-btn', { active: activeTab === 'stock' }]" @click="activeTab = 'stock'">In Stock</button>
            <button :class="['tab-btn', { active: activeTab === 'archive' }]" @click="activeTab = 'archive'">Tasting Archive</button>
            <button :class="['tab-btn', { active: activeTab === 'favourites' }]" @click="switchToFavourites">Club Favourites</button>
          </div>

          <!-- Stock Tab -->
          <article v-if="activeTab === 'stock'" class="bottles-section">
            <h3>Bottles in Stock</h3>
            <div v-if="stockBottles.length === 0">No bottles in stock</div>
            <div v-else>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Strength</th>
                    <th>Size</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bottle in stockBottles" :key="bottle.id">
                    <td><strong>{{ bottle.name }}</strong></td>
                    <td>{{ bottle.age }}</td>
                    <td>{{ bottle.strength }}</td>
                    <td>{{ bottle.bottle_size }}</td>
                    <td>{{ bottle.year_bottled }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <!-- Archive Tab -->
          <article v-if="activeTab === 'archive' && !selectedBottle" class="bottles-section">
            <h3>Tasting Archive</h3>
            <div v-if="tastedBottles.length === 0">No tasted bottles yet</div>
            <div v-else>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Strength</th>
                    <th>Avg Rating</th>
                    <th>Reviews</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bottle in tastedBottles" :key="bottle.id">
                    <td><strong>{{ bottle.name }}</strong></td>
                    <td>{{ bottle.age }}</td>
                    <td>{{ bottle.strength }}</td>
                    <td>
                      <span class="stars-display">{{ renderStars(bottle.avg_rating) }}</span>
                      <span v-if="bottle.review_count > 0" class="rating-num">{{ bottle.avg_rating }}</span>
                    </td>
                    <td>{{ bottle.review_count }}</td>
                    <td><button class="btn-view" @click="openBottle(bottle)">View & Review</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <!-- Bottle Detail View (Archive) -->
          <article v-if="activeTab === 'archive' && selectedBottle" class="bottle-detail">
            <button class="btn-back-link" @click="selectedBottle = null">&larr; Back to Archive</button>
            <h3>{{ selectedBottle.name }}</h3>
            <div class="bottle-info-grid">
              <div v-if="selectedBottle.age"><span class="info-label">Age:</span> {{ selectedBottle.age }}</div>
              <div v-if="selectedBottle.strength"><span class="info-label">Strength:</span> {{ selectedBottle.strength }}</div>
              <div v-if="selectedBottle.bottle_size"><span class="info-label">Size:</span> {{ selectedBottle.bottle_size }}</div>
              <div v-if="selectedBottle.year_bottled"><span class="info-label">Year:</span> {{ selectedBottle.year_bottled }}</div>
            </div>
            <div class="bottle-rating-summary">
              <span class="stars-display stars-lg">{{ renderStars(selectedBottle.avg_rating) }}</span>
              <span class="rating-num-lg">{{ selectedBottle.avg_rating || '0' }}</span>
              <span class="review-count-label">({{ selectedBottle.review_count }} review{{ selectedBottle.review_count !== 1 ? 's' : '' }})</span>
            </div>

            <!-- Review Form -->
            <div class="review-form-section">
              <h4>Your Review</h4>
              <div class="star-rating-input">
                <span
                  v-for="s in 5"
                  :key="s"
                  class="star-clickable"
                  :class="{ filled: s <= reviewForm.rating }"
                  @click="reviewForm.rating = s"
                >&#9733;</span>
              </div>
              <textarea v-model="reviewForm.note" placeholder="Tasting notes (optional)..." rows="3"></textarea>
              <div class="review-form-actions">
                <button @click="submitReview" :disabled="reviewForm.rating === 0">Submit Review</button>
                <span v-if="reviewMsg" class="form-success">{{ reviewMsg }}</span>
                <span v-if="reviewError" class="form-error">{{ reviewError }}</span>
              </div>
            </div>

            <!-- Reviews List -->
            <div class="reviews-list">
              <h4>All Reviews ({{ bottleReviews.length }})</h4>
              <div v-if="bottleReviews.length === 0" class="no-reviews">No reviews yet. Be the first!</div>
              <div
                v-for="review in bottleReviews"
                :key="review.id"
                :class="['review-card', { 'own-review': review.email === userEmail }]"
              >
                <div class="review-header">
                  <strong>{{ review.name || review.email }}</strong>
                  <span class="stars-display">{{ renderStars(review.rating) }}</span>
                </div>
                <p v-if="review.note" class="review-note">{{ review.note }}</p>
                <div class="review-date">{{ formatDate(review.created_at) }}</div>
              </div>
            </div>
          </article>

          <!-- Favourites Tab -->
          <article v-if="activeTab === 'favourites'" class="bottles-section favourites-section">
            <h3>Club Favourites</h3>
            <div v-if="favourites.length === 0">No rated whiskies yet</div>
            <div v-else>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Strength</th>
                    <th>Club Rating</th>
                    <th>Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(fav, idx) in favourites" :key="idx">
                    <td><strong>{{ fav.name }}</strong></td>
                    <td>{{ fav.age }}</td>
                    <td>{{ fav.strength }}</td>
                    <td>
                      <span class="stars-display">{{ renderStars(fav.club_avg_rating) }}</span>
                      <span class="rating-num">{{ fav.club_avg_rating }}</span>
                    </td>
                    <td>{{ fav.club_review_count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </main>
      </div>
    </div>
  `,

  setup() {
    const isLoggedIn = ref(false);
    const userEmail = ref("");
    const userName = ref("");
    const userRole = ref("");
    const userToken = ref("");
    const bottles = ref([]);
    const favourites = ref([]);
    const activeTab = ref("stock");
    const selectedBottle = ref(null);
    const bottleReviews = ref([]);
    const reviewForm = ref({ rating: 0, note: "" });
    const reviewMsg = ref("");
    const reviewError = ref("");
    const countdownHours = ref(0);
    const countdownMinutes = ref(0);
    const countdownSeconds = ref(0);
    const googleClientId = ref("256483321761-a4hsvv36hbeslq1l3vjm0souh7988fir.apps.googleusercontent.com");
    const apiBase = location.hostname === "localhost" ? "http://localhost:8080" : "https://b0spsb1dub.execute-api.eu-west-1.amazonaws.com";

    const stockBottles = computed(() => bottles.value.filter(b => (b.status || "stock") === "stock"));
    const tastedBottles = computed(() => bottles.value.filter(b => b.status === "tasted"));

    const renderStars = (rating) => {
      const full = Math.round(rating || 0);
      return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
    };

    const formatDate = (isoStr) => {
      if (!isoStr) return "";
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    };

    // Calculate countdown to next Thursday 18:00
    const updateCountdown = () => {
      const now = new Date();
      let nextThursday = new Date(now);
      const currentDay = now.getDay();
      const daysUntilThursday = (4 - currentDay + 7) % 7;
      if (daysUntilThursday === 0 && now.getHours() >= 18) {
        nextThursday.setDate(nextThursday.getDate() + 7);
      } else if (daysUntilThursday > 0) {
        nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
      }
      nextThursday.setHours(18, 0, 0, 0);
      const diff = nextThursday - now;
      countdownHours.value = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
      countdownMinutes.value = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
      countdownSeconds.value = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));
    };

    const startCountdownTimer = () => {
      updateCountdown();
      setInterval(updateCountdown, 1000);
    };

    const fetchBottles = async () => {
      try {
        const res = await fetch(`${apiBase}/bottles`, {
          headers: { "Authorization": `Bearer ${userToken.value}` }
        });
        if (res.ok) {
          bottles.value = await res.json();
        }
      } catch (error) {
        // silent
      }
    };

    const fetchFavourites = async () => {
      try {
        const res = await fetch(`${apiBase}/favourites`, {
          headers: { "Authorization": `Bearer ${userToken.value}` }
        });
        if (res.ok) {
          favourites.value = await res.json();
        }
      } catch (error) {
        // silent
      }
    };

    const switchToFavourites = () => {
      activeTab.value = "favourites";
      fetchFavourites();
    };

    const openBottle = async (bottle) => {
      selectedBottle.value = bottle;
      reviewForm.value = { rating: 0, note: "" };
      reviewMsg.value = "";
      reviewError.value = "";
      // Fetch reviews
      try {
        const res = await fetch(`${apiBase}/bottles/${bottle.id}/reviews`, {
          headers: { "Authorization": `Bearer ${userToken.value}` }
        });
        if (res.ok) {
          bottleReviews.value = await res.json();
          // Pre-fill if user already reviewed
          const own = bottleReviews.value.find(r => r.email === userEmail.value);
          if (own) {
            reviewForm.value.rating = own.rating;
            reviewForm.value.note = own.note || "";
          }
        }
      } catch (e) {
        bottleReviews.value = [];
      }
    };

    const submitReview = async () => {
      if (reviewForm.value.rating < 1) return;
      reviewMsg.value = "";
      reviewError.value = "";
      try {
        const res = await fetch(`${apiBase}/bottles/${selectedBottle.value.id}/reviews`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${userToken.value}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ rating: reviewForm.value.rating, note: reviewForm.value.note })
        });
        if (res.ok) {
          const data = await res.json();
          reviewMsg.value = "Review saved!";
          // Update bottle in local list
          selectedBottle.value.avg_rating = data.avg_rating;
          selectedBottle.value.review_count = data.review_count;
          // Refresh reviews
          const revRes = await fetch(`${apiBase}/bottles/${selectedBottle.value.id}/reviews`, {
            headers: { "Authorization": `Bearer ${userToken.value}` }
          });
          if (revRes.ok) {
            bottleReviews.value = await revRes.json();
          }
        } else {
          const data = await res.json();
          reviewError.value = data.error || "Failed to save review";
        }
      } catch (e) {
        reviewError.value = "Network error";
      }
    };

    const goToAdminPanel = () => {
      window.location.href = "admin.html";
    };

    // Google OAuth
    let codeClient = null;
    const initGoogle = () => {
      const attemptInit = () => {
        if (window.google && window.google.accounts && window.google.accounts.oauth2) {
          codeClient = window.google.accounts.oauth2.initCodeClient({
            client_id: googleClientId.value,
            scope: "openid email profile",
            ux_mode: "popup",
            callback: async (response) => {
              if (response.error) {
                console.error("Google auth error:", response.error);
                return;
              }
              await handleAuthCode(response.code);
            },
          });
        } else {
          setTimeout(attemptInit, 100);
        }
      };
      attemptInit();
    };

    const signInWithGoogle = () => {
      if (codeClient) {
        codeClient.requestCode();
      }
    };

    const handleAuthCode = async (code) => {
      try {
        const res = await fetch(`${apiBase}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("authToken", data.id_token);
          localStorage.setItem("userEmail", data.email);
          localStorage.setItem("userName", data.name);
          localStorage.setItem("userRole", data.role);
          userToken.value = data.id_token;
          userEmail.value = data.email;
          userName.value = data.name;
          userRole.value = data.role;
          isLoggedIn.value = true;
          startCountdownTimer();
          fetchBottles();
        } else {
          alert("Login failed");
        }
      } catch (error) {
        alert("Login error");
      }
    };

    initGoogle();
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      const email = localStorage.getItem("userEmail");
      const name = localStorage.getItem("userName");
      const role = localStorage.getItem("userRole");
      if (token && email) {
        userToken.value = token;
        userEmail.value = email;
        userName.value = name;
        userRole.value = role;
        isLoggedIn.value = true;
        startCountdownTimer();
        fetchBottles();
      }
    };

    const logout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userRole");
      userToken.value = "";
      userEmail.value = "";
      userName.value = "";
      userRole.value = "";
      isLoggedIn.value = false;
    };

    checkAuth();

    return {
      isLoggedIn,
      userEmail,
      userName,
      userRole,
      bottles,
      favourites,
      activeTab,
      selectedBottle,
      bottleReviews,
      reviewForm,
      reviewMsg,
      reviewError,
      stockBottles,
      tastedBottles,
      countdownHours,
      countdownMinutes,
      countdownSeconds,
      renderStars,
      formatDate,
      switchToFavourites,
      openBottle,
      submitReview,
      goToAdminPanel,
      signInWithGoogle,
      logout,
    };
  },
});

app.mount("#app");
