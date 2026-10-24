import mongoose from 'mongoose';

const ProgramSchema = new mongoose.Schema(
  {
    programName: { type: String, required: true },
    level: {
      type: String,
      enum: ['DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'DOCTORAL'],
      default: 'UNDERGRADUATE',
    },
    shift: { type: String, default: '1st Shift' },
    approvedIntake: { type: Number, required: true, min: 0 },
    currentEnrollment: { type: Number, default: 0, min: 0 },
    academicYear: { type: String, required: true },
  },
  { _id: false }
);

const InstitutionSchema = new mongoose.Schema(
  {
    aictePermanentId: {
      type: String,
      required: [true, 'AICTE Permanent ID is mandatory'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Institution name is mandatory'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['ENGINEERING_TECH', 'MANAGEMENT', 'PHARMACY', 'APPLIED_ARTS', 'ARCHITECTURE', 'HOTEL_MANAGEMENT'],
      default: 'ENGINEERING_TECH',
      required: true,
    },
    address: {
      street: { type: String, default: '' },
      district: { type: String, default: '' },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    geoCoordinates: {
      latitude: {
        type: Number,
        required: [true, 'Registered campus latitude is mandatory for forensic geofencing'],
      },
      longitude: {
        type: Number,
        required: [true, 'Registered campus longitude is mandatory for forensic geofencing'],
      },
      geofenceRadiusMeters: { type: Number, default: 800 },
    },
    landDetails: {
      totalAreaSqm: { type: Number, required: true },
      surveyNumbers: [{ type: String }],
      ownershipStatus: {
        type: String,
        enum: ['OWNED', 'LEASED_GOVT', 'MORTGAGED'],
        default: 'OWNED',
      },
      landUseCertificateNumber: { type: String, default: '' },
    },
    sanctionedPrograms: [ProgramSchema],
    contactPerson: {
      name: { type: String, required: true },
      designation: { type: String, default: 'Principal / Director' },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
    },
    regulatoryStatus: {
      type: String,
      enum: ['ACTIVE', 'DEFICIENT', 'UNDER_INSPECTION', 'BARRED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

const Institution = mongoose.model('Institution', InstitutionSchema);
export default Institution;
