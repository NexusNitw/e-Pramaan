import mongoose from 'mongoose';

const ComplianceRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['ACADEMIC_RATIO', 'INFRASTRUCTURE', 'SAFETY_MANDATE', 'FACULTY_DEDUPLICATION', 'INTAKE_SANCTION'],
      required: true,
      index: true,
    },
    description: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR'],
      default: 'CRITICAL',
    },
    penaltyWeight: {
      type: Number,
      min: 0,
      max: 100,
      default: 25,
      description: 'Impact weight on the composite 0-100 risk score upon violation',
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Threshold values e.g. { maxStudentFacultyRatio: 15, minSqMetersPerStudent: 5.5 }',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const ComplianceRule = mongoose.model('ComplianceRule', ComplianceRuleSchema);
export default ComplianceRule;
