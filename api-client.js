const API_BASE = 'http://127.0.0.1:8000';

const ENDPOINTS = {
    userMe: `${API_BASE}/main/users/me/`,

    cars: `${API_BASE}/main/cars/`,
    carDetail: (id) => `${API_BASE}/main/cars/${id}/`,

    bookings: `${API_BASE}/main/bookings/`,
    bookingDetail: (id) => `${API_BASE}/main/bookings/${id}/`,

    token: `${API_BASE}/auth/token/`,
    register: `${API_BASE}/auth/register/`,
    logout: `${API_BASE}/auth/logout/`,

    createPayment: API_BASE + '/payments/create/',
    checkPayment: (payment_id) => `${API_BASE}/payments/check/${payment_id}/`,

    searchCars: `${API_BASE}/main/cars/search/`
};

class ApiClient {
    constructor() {
        this.baseHeaders = {
            'Content-Type': 'application/json',
        };

        this.accessToken = null;
        this.refreshToken = null;

        try {
            this.accessToken = localStorage.getItem('access_token');
            this.refreshToken = localStorage.getItem('refresh_token');
        } catch (e) {
            console.warn('Could not access localStorage for JWT tokens', e);
        }
    }

    async getUnreadNotifications() {
        return { count: 0 };
    }

    async refreshTokens() {
        if (!this.refreshToken) {
            throw new Error("No refresh token available.");
        }

        const res = await fetch(ENDPOINTS.token + 'refresh/', {
            method: 'POST',
            headers: this.baseHeaders,
            body: JSON.stringify({ refresh: this.refreshToken }),
        });

        if (!res.ok) {
            throw new Error("Failed to refresh token.");
        }

        const data = await res.json();
        if (data.access) {
            this.setTokens(data.access, this.refreshToken);
            return true;
        }
        throw new Error("Refresh token returned no access token.");
    }

    async request(url, options = {}) {
        try {
            const headers = {
                ...this.baseHeaders,
                ...options.headers,
            };

            if (this.accessToken) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
            }

            const response = await fetch(url, {
                headers,
                ...options,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 401 && !options.isRetry) {
                    try {
                         await this.refreshTokens();
                         options.isRetry = true;
                         return this.request(url, options);
                    } catch (e) {

                        throw new Error("Unauthorized");
                    }
                }


                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            if (options.method === 'DELETE' && response.status === 204) {
                return { success: true };
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    setTokens(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        try {
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('jwt_token', access);
            this.dispatchEvent('tokensChanged', { access, refresh });
        } catch (e) {
            console.warn('Could not save JWT to localStorage', e);
        }
    }

    async logout() {
        if (this.refreshToken) {
            try {
                await fetch(ENDPOINTS.logout, {
                    method: 'POST',
                    headers: this.baseHeaders,
                    body: JSON.stringify({ refresh: this.refreshToken }),
                });
            } catch (e) {
                console.warn('Logout request failed (server side), but clearing tokens locally.', e);
            }
        }
        this.clearTokens();
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('jwt_token');
            this.dispatchEvent('tokensChanged', { access: null, refresh: null });
        } catch (e) {
            console.warn('Could not remove JWT from localStorage', e);
        }
    }

    getToken() {
        return this.accessToken;
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    events = {};

    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    dispatchEvent(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }

    async login(credentials) {
        const res = await fetch(ENDPOINTS.token, {
            method: 'POST',
            headers: this.baseHeaders,
            body: JSON.stringify(credentials),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || err.message || `Login failed: ${res.status}`);
        }

        const data = await res.json();

        const access = data.access || null;
        const refresh = data.refresh || null;

        if (!access || !refresh) {
            throw new Error('Login did not return both access and refresh tokens');
        }

        this.setTokens(access, refresh);
        return access;
    }

    async getCurrentUser() {
        if (!this.accessToken) return null;
        return this.request(ENDPOINTS.userMe);
    }


    async createPayment(bookingId, amount, description) {
        return this.request(ENDPOINTS.createPayment, {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                amount: amount,
                description: description
            }),
        });
    }

    async checkPaymentStatus(paymentId) {
        return this.request(ENDPOINTS.checkPayment(paymentId));
    }

    async createBookingWithPayment(carId, startDate, endDate, totalAmount) {
        const booking = await this.createBooking({
            car: carId,
            start_date: startDate,
            end_date: endDate,
            status: 'pending_payment'
        });
        const payment = await this.createPayment(
            booking.id,
            totalAmount,
            `Оренда авто ${carId} з ${startDate} по ${endDate}`
        );

        return { booking, payment };
    }

    async getCars() { return this.request(ENDPOINTS.cars); }
    async getCar(id) { return this.request(ENDPOINTS.carDetail(id)); }
    async createCar(carData) {
        return this.request(ENDPOINTS.cars, {
            method: 'POST',
            body: carData
        });
    }

    async updateCar(id, carData) { return this.request(ENDPOINTS.carDetail(id), { method: 'PUT', body: JSON.stringify(carData) }); }
    async deleteCar(id) { return this.request(ENDPOINTS.carDetail(id), { method: 'DELETE' }); }
    async getBookings() { return this.request(ENDPOINTS.bookings); }
    async getBooking(id) { return this.request(ENDPOINTS.bookingDetail(id)); }
    async createBooking(bookingData) { return this.request(ENDPOINTS.bookings, { method: 'POST', body: JSON.stringify(bookingData) }); }
    async updateBooking(id, bookingData) { return this.request(ENDPOINTS.bookingDetail(id), { method: 'PUT', body: JSON.stringify(bookingData) }); }
    async deleteBooking(id) { return this.request(ENDPOINTS.bookingDetail(id), { method: 'DELETE' }); }
    async searchCars(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`${ENDPOINTS.cars}?${queryParams}`);
    }
}

const apiClient = new ApiClient();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { apiClient, ENDPOINTS };
} else {
    window.apiClient = apiClient;
    window.ENDPOINTS = ENDPOINTS;
}
