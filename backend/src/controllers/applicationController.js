import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import AuditTrail from '../models/AuditTrail.js';

/**
 * Submit a new regulatory dossier application.
 */
export const createApplication = async (req, res, next) => {
  try {
    const { applicationNumber, institution, category, requestedIntake, totalStudentEnrolled, academicYear } = req.body;

    // Verify institution exists
    const inst = await Institution.findById(institution);
    if (!inst) {
      return res.status(404).json({
        success: false,
        message: `Referenced institution '${institution}' does not exist.`,
      });
    }

    const application = await Application.create({
      applicationNumber: applicationNumber || `AICTE-${Date.now().toString().slice(-6)}-${category.slice(0, 3)}`,
      institution,
      category,
      requestedIntake,
      totalStudentEnrolled: totalStudentEnrolled || 0,
      academicYear: academicYear || '2026-2027',
      status: 'SUBMITTED',
      triageStatus: 'PENDING',
    });

    // Record initial immutable audit trail record
    const hash = AuditTrail.computeHash(
      { appId: application._id, status: application.status, appNumber: application.applicationNumber },
      'GENESIS_TRAIL_0000000000000000000000000000000000000000000000000000000000000000'
    );

    await AuditTrail.create({
      applicationId: application._id,
      action: 'APPLICATION_SUBMITTED',
      performedBy: {
        userId: inst.aictePermanentId,
        role: 'APPLICANT_PORTAL',
        ipAddress: req.ip || '127.0.0.1',
      },
      details: {
        applicationNumber: application.applicationNumber,
        category: application.category,
        requestedIntake: application.requestedIntake,
      },
      previousHash: 'GENESIS_TRAIL_0000000000000000000000000000000000000000000000000000000000000000',
      stateHashSha256: hash,
    });

    return res.status(201).json({
      success: true,
      message: 'Regulatory application dossier submitted successfully.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List applications with triage filtering (Green, Yellow, Red) and pagination.
 */
export const getApplications = async (req, res, next) => {
  try {
    const { triageStatus, category, status, academicYear, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (triageStatus) filter.triageStatus = triageStatus;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (academicYear) filter.academicYear = academicYear;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .populate('institution', 'name aictePermanentId category address')
      .populate('documents')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: applications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve comprehensive application dossier with populated documents and audit trail.
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id)
      .populate('institution')
      .populate('documents');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `Application '${id}' not found.`,
      });
    }

    const auditHistory = await AuditTrail.find({ applicationId: id }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      data: {
        application,
        auditHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Scrutiny Officer action: add remark or override flag with reason.
 */
export const addOfficerRemark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { officerId, officerName, action, comment, overrideTriageStatus } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: `Application '${id}' not found.`,
      });
    }

    application.scrutinyRemarks.push({
      officerId: officerId || 'OFFICER-001',
      officerName: officerName || 'Scrutiny Officer',
      action,
      comment,
      timestamp: new Date(),
    });

    if (overrideTriageStatus) {
      application.triageStatus = overrideTriageStatus;
    }

    await application.save();

    // Fetch latest audit record to chain hash
    const latestAudit = await AuditTrail.findOne({ applicationId: id }).sort({ timestamp: -1 });
    const prevHash = latestAudit ? latestAudit.stateHashSha256 : 'GENESIS_TRAIL';

    const newHash = AuditTrail.computeHash(
      { officerId, action, comment, overrideTriageStatus, timestamp: new Date() },
      prevHash
    );

    await AuditTrail.create({
      applicationId: application._id,
      action: 'OFFICER_OVERRIDE_APPLIED',
      performedBy: {
        userId: officerId || 'OFFICER-001',
        role: 'SCRUTINY_OFFICER',
        ipAddress: req.ip || '127.0.0.1',
      },
      details: { action, comment, overrideTriageStatus },
      previousHash: prevHash,
      stateHashSha256: newHash,
    });

    return res.status(200).json({
      success: true,
      message: 'Officer remark logged and audit trail updated.',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};
