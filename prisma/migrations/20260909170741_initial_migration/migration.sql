-- CreateEnum
CREATE TYPE "Team" AS ENUM ('HR', 'RECRUITMENT');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'MONTHLY', 'COHORT');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEK', 'MONTH', 'ROLLING_90');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SlaStatus" AS ENUM ('ON_TIME', 'LATE', 'PENDING', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "CandidateStage" AS ENUM ('SOURCED', 'SCREENED', 'INTERVIEWED', 'ENDORSED', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "QualityMilestoneStatus" AS ENUM ('NOT_DUE', 'DUE', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AttributionStatus" AS ENUM ('RECRUITER_ATTRIBUTABLE', 'NOT_ATTRIBUTABLE', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('ADMIN', 'HR_MANAGER', 'RECRUITMENT_MANAGER', 'EMPLOYEE', 'VIEWER');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "AppRole" NOT NULL DEFAULT 'VIEWER',
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIConfig" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "target" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "direction" "Direction" NOT NULL,
    "calculationType" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "slaTargetDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KPIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRActivityLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "referenceId" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "slaStatus" "SlaStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentCandidate" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "source" TEXT,
    "dateSourced" TIMESTAMP(3),
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "screeningDate" TIMESTAMP(3),
    "interviewDate" TIMESTAMP(3),
    "endorsementDate" TIMESTAMP(3),
    "offerDate" TIMESTAMP(3),
    "hireDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "stage" "CandidateStage" NOT NULL DEFAULT 'SOURCED',
    "status" TEXT,
    "rejectionReason" TEXT,
    "trainingStatus" TEXT,
    "clientReadyStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentHire" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "hiringCohort" TEXT NOT NULL,
    "day30DueDate" TIMESTAMP(3) NOT NULL,
    "day60DueDate" TIMESTAMP(3) NOT NULL,
    "day90DueDate" TIMESTAMP(3) NOT NULL,
    "day30Status" "QualityMilestoneStatus" NOT NULL DEFAULT 'NOT_DUE',
    "day60Status" "QualityMilestoneStatus" NOT NULL DEFAULT 'NOT_DUE',
    "day90Status" "QualityMilestoneStatus" NOT NULL DEFAULT 'NOT_DUE',
    "performanceScore" DECIMAL(5,2),
    "clientSatisfaction" DECIMAL(5,2),
    "attendanceScore" DECIMAL(5,2),
    "trainingQAScore" DECIMAL(5,2),
    "retentionStatus" TEXT,
    "qualityScore" DECIMAL(5,2),
    "attributionStatus" "AttributionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "evaluationStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitmentHire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandPlanning" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "available" INTEGER NOT NULL,
    "clientReady" INTEGER NOT NULL,
    "incomingDemand" INTEGER NOT NULL,
    "pocEmployeeId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandPlanning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPIResult" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "target" DECIMAL(10,2) NOT NULL,
    "actual" DECIMAL(10,2) NOT NULL,
    "achievement" DECIMAL(6,4) NOT NULL,
    "score" DECIMAL(4,2) NOT NULL,
    "rating" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "weightedScore" DECIMAL(6,4) NOT NULL,
    "status" TEXT,
    "sampleSize" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPIResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KPISnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "actual" DECIMAL(10,2) NOT NULL,
    "target" DECIMAL(10,2) NOT NULL,
    "achievement" DECIMAL(6,4) NOT NULL,
    "score" DECIMAL(4,2) NOT NULL,
    "rating" TEXT NOT NULL,
    "weightedScore" DECIMAL(6,4) NOT NULL,
    "sampleSize" INTEGER,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KPISnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_employeeId_key" ON "Profile"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_team_idx" ON "Employee"("team");

-- CreateIndex
CREATE INDEX "Employee_active_idx" ON "Employee"("active");

-- CreateIndex
CREATE INDEX "KPIConfig_employeeId_active_idx" ON "KPIConfig"("employeeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Period_periodType_label_key" ON "Period"("periodType", "label");

-- CreateIndex
CREATE INDEX "HRActivityLog_employeeId_receivedDate_idx" ON "HRActivityLog"("employeeId", "receivedDate");

-- CreateIndex
CREATE INDEX "HRActivityLog_activityType_idx" ON "HRActivityLog"("activityType");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentCandidate_applicationId_key" ON "RecruitmentCandidate"("applicationId");

-- CreateIndex
CREATE INDEX "RecruitmentCandidate_recruiterId_stage_idx" ON "RecruitmentCandidate"("recruiterId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentHire_candidateId_key" ON "RecruitmentHire"("candidateId");

-- CreateIndex
CREATE INDEX "RecruitmentHire_recruiterId_hiringCohort_idx" ON "RecruitmentHire"("recruiterId", "hiringCohort");

-- CreateIndex
CREATE INDEX "RecruitmentHire_day30Status_day60Status_day90Status_idx" ON "RecruitmentHire"("day30Status", "day60Status", "day90Status");

-- CreateIndex
CREATE UNIQUE INDEX "KPIResult_periodId_employeeId_kpiName_key" ON "KPIResult"("periodId", "employeeId", "kpiName");

-- CreateIndex
CREATE INDEX "KPISnapshot_employeeId_periodId_idx" ON "KPISnapshot"("employeeId", "periodId");

-- CreateIndex
CREATE INDEX "AuditLog_recordType_recordId_idx" ON "AuditLog"("recordType", "recordId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIConfig" ADD CONSTRAINT "KPIConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRActivityLog" ADD CONSTRAINT "HRActivityLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentCandidate" ADD CONSTRAINT "RecruitmentCandidate_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentHire" ADD CONSTRAINT "RecruitmentHire_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "RecruitmentCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentHire" ADD CONSTRAINT "RecruitmentHire_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIResult" ADD CONSTRAINT "KPIResult_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPIResult" ADD CONSTRAINT "KPIResult_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPISnapshot" ADD CONSTRAINT "KPISnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPISnapshot" ADD CONSTRAINT "KPISnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
