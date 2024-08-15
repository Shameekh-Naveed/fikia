import { UserRole } from 'src/enums/user-role.enum';

const isCompanyEntity = (role: UserRole) => {
  return role === UserRole.COMPANY_ADMIN || role === UserRole.COMPANY_RECRUITER;
};

const isCompanyManager = (role: UserRole) => {
  return role === UserRole.COMPANY_ADMIN;
};

const isUniversityEntity = (role: UserRole) => {
  return role === UserRole.UNI_ADMIN || role === UserRole.UNI_COUNSELOR;
};

const isUniversityManager = (role: UserRole) => {
  return role === UserRole.UNI_ADMIN;
};

export { isCompanyEntity, isCompanyManager };
