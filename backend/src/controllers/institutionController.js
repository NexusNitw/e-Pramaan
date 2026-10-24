import Institution from '../models/Institution.js';

/**
 * Register or update an institution record in MongoDB Atlas.
 */
export const createInstitution = async (req, res, next) => {
  try {
    const { aictePermanentId } = req.body;
    let institution = await Institution.findOne({ aictePermanentId });

    if (institution) {
      return res.status(409).json({
        success: false,
        message: `Institution with AICTE ID '${aictePermanentId}' already exists.`,
        data: institution,
      });
    }

    institution = await Institution.create(req.body);

    return res.status(201).json({
      success: true,
      message: 'Institution profile registered successfully.',
      data: institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List registered institutions with optional category & status filtering.
 */
export const getInstitutions = async (req, res, next) => {
  try {
    const { category, regulatoryStatus, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (regulatoryStatus) filter.regulatoryStatus = regulatoryStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { aictePermanentId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Institution.countDocuments(filter);
    const institutions = await Institution.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: institutions.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: institutions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get institution details by MongoDB ID or AICTE Permanent ID.
 */
export const getInstitutionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { aictePermanentId: id };
    const institution = await Institution.findOne(query);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: `Institution with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: institution,
    });
  } catch (error) {
    next(error);
  }
};
