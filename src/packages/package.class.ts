export enum StudentCounts {
  Red = 2,
  Orange = 20000,
  Light = 50000,
  Green = 99999999,
}

export enum CompanyCounts {
  Red = 0,
  Orange = 2,
  Light = 4,
  Green = 6,
}

export class Package {
  constructor(
    public id: string,
    public name: string,
    public price?: number,
  ) {}
}

export class UniversityPackage extends Package {
  constructor(
    id: string,
    name: string,
    // price: number,
    // priceID: string,
    public maxStudents: StudentCounts,
  ) {
    super(id, name);
  }
}

export class CompanyPackage extends Package {
  constructor(
    id: string,
    name: string,

    public virtualWorkProjects: CompanyCounts,
    public jobs: CompanyCounts,
    public recruiters: CompanyCounts,
  ) {
    super(id, name);
  }
}
