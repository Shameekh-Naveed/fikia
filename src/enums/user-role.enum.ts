export enum UserRole {
  OWNER = 'superAdmin-owner',
  ADMIN = 'superAdmin-admin', // ! should Not be using this in assigning becuase only owner can make admins
  STUDENT = 'student',
  // UNIMOD = 'university-mod',
  UNI_ADMIN = 'university-admin',
  UNI_COUNSELOR = 'university-counselor',
  // COMPANYMOD = 'company-mod',
  // COMPANY_OWNER = 'company-owner',
  COMPANY_ADMIN = 'company-admin',
  COMPANY_RECRUITER = 'company-recruiter',
}

export enum ExperienceLevel {
  LOW = 'low',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert',
}
