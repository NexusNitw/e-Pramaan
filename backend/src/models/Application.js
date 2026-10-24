import mongoose from 'mongoose';

const ScrutinyRemarkSchema = new mongoose.Schema(
  {
    officerId: { type: String, required: true },
    officerName: { type: String, required: true },
    action: {
      type: String,
      enum: ['FLAG_OVERRIDDEN', 'PHYSICAL_INSPECTION_REQUESTED', 'DEFICIENCY_NOTICE_ISSUED', 'SCRUTINY_APPROVED'],
      required: true,
    },
    comment: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RuleResultSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    passed: { type: Boolean, required: true },
    severity: { type: String, enum: ['CRITICAL', 'MAJOR', 'MINOR'], default: 'CRITICAL' },
    observedValue: { type: mongoose.Schema.Types.Mixed },
    requiredValue: { type: mongoose.Schema.Types.Mixed },
    message: { type: String, default: '' },
    penaltyScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: [true, 'Application number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: '2026-2027',
    },
    category: {
      type: String,
      enum: [
        'EXTENSION_OF_APPROVAL',
        'NEW_INSTITUTION',
        'INCREASE_IN_INTAKE',
        'INTRODUCTION_OF_SUPERNUMERARY_SEATS',
        'CLOSURE_OF_COURSE',
      ],
      required: true,
      index: true,
    },
    requestedIntake: {
      type: Number,
      required: true,
      min: 0,
    },
    totalStudentEnrolled: {
      type: Number,
      default: 0,
      min: 0,
    },
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DocumentRecord',
      },
    ],
    triageStatus: {
      type: String,
      enum: ['PENDING', 'GREEN_COMPLIANT', 'YELLOW_DEFICIENCY', 'RED_HIGH_RISK_FORGERY'],
      default: 'PENDING',
      index: true,
    },
    compositeRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    ruleExecutionResults: [RuleResultSchema],
    scrutinyRemarks: [ScrutinyRemarkSchema],
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_PROCESSING', 'SCRUTINY_COMPLETED', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Application = mongoose.model('Application', ApplicationSchema);
export default Application;
