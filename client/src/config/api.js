/**
 * Centralized API configuration and service calls for AICTE e-Pramaan.
 * Seamlessly handles local development and production deployments (Vercel + Render).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Fetch all regulatory application dossiers from MongoDB Atlas.
 */
export async function fetchApplications(filters = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const params = new URLSearchParams(filters).toString();
    const url = `${API_BASE_URL}/api/applications${params ? `?${params}` : ''}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch applications: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}


/**
 * Fetch complete dossier with populated documents and audit trail.
 */
export async function fetchApplicationById(id) {
  const res = await fetch(`${API_BASE_URL}/api/applications/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch dossier '${id}': ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Create a new application dossier in MongoDB.
 */
export async function createApplicationDossier(payload) {
  const res = await fetch(`${API_BASE_URL}/api/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to submit application: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

const CATEGORY_DOC_TYPE_MAP = {
  fire_noc: 'FIRE_SAFETY_NOC',
  building_plan: 'BUILDING_PLAN_APPROVAL',
  affiliation_letter: 'UNIVERSITY_AFFILIATION_LETTER',
  faculty_roster: 'FACULTY_MASTER_ROSTER',
  land_deed: 'LAND_TITLE_DEED',
  land_title_deed: 'LAND_TITLE_DEED',
  infra_photo: 'INFRASTRUCTURE_PHOTO',
};

/**
 * Upload a document to Cloudinary via backend multipart endpoint.
 */
export async function uploadDocumentFile(file, categoryId, applicationId, institutionId) {
  const formData = new FormData();
  formData.append('file', file);
  const normalizedType =
    CATEGORY_DOC_TYPE_MAP[categoryId?.toLowerCase()] ||
    categoryId?.toUpperCase() ||
    'OTHER';
  formData.append('documentType', normalizedType);
  if (applicationId) formData.append('applicationId', applicationId);
  if (institutionId) formData.append('institutionId', institutionId);

  const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Trigger complete automated multi-service AI scrutiny across OCR, CV Forensics, and PKI.
 */
export async function runScrutinyPipeline(applicationId) {
  const res = await fetch(`${API_BASE_URL}/api/scrutiny/orchestrate/${applicationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Scrutiny orchestration failed: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Diagnostic health check across Orchestrator Gateway and MongoDB.
 */
export async function checkSystemHealth() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Apply officer override or decision remark to dossier in MongoDB Atlas.
 */
export async function submitOfficerRemark(applicationId, payload) {
  const token = localStorage.getItem('epramaan_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/remarks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to log remark: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Authentication: Login with email & password.
 */
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed.');
  }
  return data;
}

/**
 * Authentication: Register new user.
 */
export async function registerUser(userData) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Registration failed.');
  }
  return data;
}

/**
 * Authentication: Fetch current profile using stored JWT token.
 */
export async function fetchCurrentUser() {
  const token = localStorage.getItem('epramaan_token');
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    localStorage.removeItem('epramaan_token');
    localStorage.removeItem('epramaan_user');
    return null;
  }
  return await res.json();
}

/**
 * Export official AICTE Scrutiny Summary Report as a downloadable PDF file.
 */
export async function downloadScrutinyReportPdf(applicationId, applicationNumber = 'Dossier') {
  const token = localStorage.getItem('epramaan_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/scrutiny/application/${applicationId}/export-pdf`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to export PDF: ${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `AICTE_Scrutiny_Report_${applicationNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

