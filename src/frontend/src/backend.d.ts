import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Department {
    id: bigint;
    icon: string;
    color: string;
    departmentLabel: string;
    patientCount: bigint;
}
export interface FormField {
    name: string;
    fieldType: string;
    options: string[];
}
export interface FormTemplate {
    id: bigint;
    departmentId: bigint;
    title: string;
    fields: Array<string>;
}
export interface FieldValue {
    field: string;
    value: string;
}
export interface DepartmentHead {
    pin: string;
    name: string;
    departmentId: bigint;
}
export interface AppConfig {
    tvRefreshRate: bigint;
    departmentName: string;
    hospitalName: string;
}
export interface Report {
    id: bigint;
    fieldValues: Array<FieldValue>;
    submittedBy: string;
    timestamp: bigint;
    departmentId: bigint;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDepartment(departmentLabel: string, icon: string, color: string): Promise<bigint>;
    createDepartmentHead(name: string, pin: string, departmentId: bigint): Promise<void>;
    createFormTemplate(title: string, fields: Array<string>): Promise<bigint>;
    deleteDepartment(id: bigint): Promise<void>;
    deleteDepartmentHead(pin: string): Promise<void>;
    deleteFormTemplate(id: bigint): Promise<void>;
    getAllDepartmentHeads(): Promise<Array<DepartmentHead>>;
    getAllDepartments(): Promise<Array<Department>>;
    getAllFormTemplates(): Promise<Array<FormTemplate>>;
    getAllReports(): Promise<Array<Report>>;
    getAppConfig(): Promise<AppConfig | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDepartment(id: bigint): Promise<Department | null>;
    getDepartmentHead(pin: string): Promise<DepartmentHead | null>;
    getFormTemplate(id: bigint): Promise<FormTemplate | null>;
    getReport(id: bigint): Promise<Report | null>;
    getReportsByDepartment(departmentId: bigint): Promise<Array<Report>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setAppConfig(config: AppConfig): Promise<void>;
    submitReport(departmentId: bigint, submittedBy: string, fieldValues: Array<FieldValue>): Promise<bigint>;
    updateDepartment(department: Department): Promise<void>;
    updateDepartmentHead(departmentHead: DepartmentHead): Promise<void>;
    updateFormTemplate(formTemplate: FormTemplate): Promise<void>;
}
