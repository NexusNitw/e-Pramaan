/**
 * Centralized API configuration and service calls for AICTE e-Pramaan.
 * Seamlessly handles local development and production deployments (Vercel + Render).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

/**
 * Fetch all regulatory application dossiers from MongoDB Atlas.
 */
export async function fetchApplications(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const url = `${API_BASE_URL}/api/applications${params ? `?${params}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch applications: ${res.status} ${res.statusText}`);
  }
  return await res.json();
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

/**
 * Upload a document to Cloudinary via backend multipart endpoint.
 */
export async function uploadDocumentFile(file, categoryId, applicationId, institutionId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', categoryId.toUpperCase());
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
  const res = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/remarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to log remark: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}
