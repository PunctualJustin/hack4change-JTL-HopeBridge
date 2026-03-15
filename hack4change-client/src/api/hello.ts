export const getHello = async () => {
    const response = await fetch("api/hello");
    
    if (!response.ok) {
        throw new Error(`Response status:  ${response.status}`)
    }
    
    const result = await response.text();
    
    return result;
};

export interface RegisterUserBody {
    username: string;
    password: string;
    email?: string;
}

export const registerUser = async (body: RegisterUserBody) => {
    const response = await fetch("api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const loginUser = async (body: any) => {
    const response = await fetch("api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getItems = async (token: any) => {
    const response = await fetch("api/items", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const searchItems = async (name: string | number | boolean, token: any) => {
    const response = await fetch(`api/items/search?name=${encodeURIComponent(name)}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getItemById = async (id: any, token: any) => {
    const response = await fetch(`api/items/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const createItem = async (body: any, token: any) => {
    const response = await fetch("api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const updateItem = async (id: any, body: any, token: any) => {
    const response = await fetch(`api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const deleteItem = async (id: any, token: any) => {
    const response = await fetch(`api/items/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const createDonation = async (body: any, token: any) => {
    const response = await fetch("api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const createDonationForOrganisation = async (organisationId: any, body: any, token: any) => {
    const response = await fetch(`api/donate/${organisationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getDonationHistory = async (token: any) => {
    const response = await fetch("api/donations/history", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getDonationHistoryByDonor = async (donorId: any, token: any) => {
    const response = await fetch(`api/donations/history/${donorId}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const confirmDonation = async (donationId: any, token: any) => {
    const response = await fetch(`api/donations/${donationId}/confirm`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getLowStock = async (id: any, token: any) => {
    const response = await fetch(`api/organisations/${id}/low-stock`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getOrganisationRequirements = async (id: any, token: any) => {
    const response = await fetch(`api/organisations/${id}/requirements`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getNearExpiry = async (id: any, token: any) => {
    const response = await fetch(`api/organisations/${id}/near-expiry`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const updateExpiryThreshold = async (id: any, body: any, token: any) => {
    const response = await fetch(`api/organisations/${id}/expiry-threshold`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getActivityLog = async (token: any) => {
    const response = await fetch("api/activity-log", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getUsageReport = async (token: any) => {
    const response = await fetch("api/usage-report", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const recordUsage = async (body: any, token: any) => {
    const response = await fetch("api/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const createItemRequest = async (body: any, token: any) => {
    const response = await fetch("api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getPublicRequests = async (token: any) => {
    const response = await fetch("api/requests/public", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const createSurplus = async (body: any, token: any) => {
    const response = await fetch("api/surplus", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getSurplus = async (token: any) => {
    const response = await fetch("api/surplus", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const donateSurplus = async (surplusId: any, body: any, token: any) => {
    const response = await fetch(`api/surplus/${surplusId}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getAdminUsers = async (token: any) => {
    const response = await fetch("api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const deleteAdminUser = async (userId: any, token: any) => {
    const response = await fetch(`api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getNotifications = async (unreadOnly: any, token: any) => {
    const response = await fetch(`api/notifications?unreadOnly=${unreadOnly}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const markNotificationRead = async (notificationId: any, token: any) => {
    const response = await fetch(`api/notifications/${notificationId}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getDonorContact = async (donorId: any, token: any) => {
    const response = await fetch(`api/donors/${donorId}/contact`, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

export const getDonors = async (token: any) => {
    const response = await fetch("api/donors", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
    }

    const result = await response.json();

    return result;
};

