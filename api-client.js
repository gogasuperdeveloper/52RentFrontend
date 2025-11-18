const API_BASE = 'http://localhost:8000/api';

const ENDPOINTS = {
    users: `${API_BASE}/users/`,
    userDetail: (id) => `${API_BASE}/users/${id}/`,
    
    cars: `${API_BASE}/cars/`,
    carDetail: (id) => `${API_BASE}/cars/${id}/`,
    
    bookings: `${API_BASE}/bookings/`,
    bookingDetail: (id) => `${API_BASE}/bookings/${id}/`
};

class ApiClient {
    constructor() {
        this.baseHeaders = {
            'Content-Type': 'application/json',
        };
    }

    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    ...this.baseHeaders,
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async getUsers() {
        return this.request(ENDPOINTS.users);
    }

    async getUser(id) {
        return this.request(ENDPOINTS.userDetail(id));
    }

    async createUser(userData) {
        return this.request(ENDPOINTS.users, {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async updateUser(id, userData) {
        return this.request(ENDPOINTS.userDetail(id), {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async deleteUser(id) {
        return this.request(ENDPOINTS.userDetail(id), {
            method: 'DELETE',
        });
    }

    async getCars() {
        return this.request(ENDPOINTS.cars);
    }

    async getCar(id) {
        return this.request(ENDPOINTS.carDetail(id));
    }

    async createCar(carData) {
        return this.request(ENDPOINTS.cars, {
            method: 'POST',
            body: JSON.stringify(carData),
        });
    }

    async updateCar(id, carData) {
        return this.request(ENDPOINTS.carDetail(id), {
            method: 'PUT',
            body: JSON.stringify(carData),
        });
    }

    async deleteCar(id) {
        return this.request(ENDPOINTS.carDetail(id), {
            method: 'DELETE',
        });
    }

    async getBookings() {
        return this.request(ENDPOINTS.bookings);
    }

    async getBooking(id) {
        return this.request(ENDPOINTS.bookingDetail(id));
    }

    async createBooking(bookingData) {
        return this.request(ENDPOINTS.bookings, {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }

    async updateBooking(id, bookingData) {
        return this.request(ENDPOINTS.bookingDetail(id), {
            method: 'PUT',
            body: JSON.stringify(bookingData),
        });
    }

    async deleteBooking(id) {
        return this.request(ENDPOINTS.bookingDetail(id), {
            method: 'DELETE',
        });
    }

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
