import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard, roleGuard } from './core/guards';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ReceptionComponent } from './features/reception/reception.component';
import { NursingComponent } from './features/nursing/nursing.component';
import { DoctorComponent } from './features/doctor/doctor.component';
import { PharmacyComponent } from './features/pharmacy/pharmacy.component';
import { LabComponent } from './features/lab/lab.component';
import { RadiologyComponent } from './features/radiology/radiology.component';
import { DirectorComponent } from './features/director/director.component';
import { ManagementComponent } from './features/management/management.component';
import { PatientProfileComponent } from './features/patient-profile/patient-profile.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'reception', component: ReceptionComponent, canActivate: [roleGuard(['reception'])] },
      { path: 'nursing', component: NursingComponent, canActivate: [roleGuard(['nurse'])] },
      { path: 'doctor', component: DoctorComponent, canActivate: [roleGuard(['doctor'])] },
      { path: 'pharmacy', component: PharmacyComponent, canActivate: [roleGuard(['pharmacy'])] },
      { path: 'lab', component: LabComponent, canActivate: [roleGuard(['laboratory'])] },
      { path: 'radiology', component: RadiologyComponent, canActivate: [roleGuard(['radiology'])] },
      { path: 'management', component: ManagementComponent, canActivate: [roleGuard(['manager'])] },
      { path: 'director', component: DirectorComponent, canActivate: [roleGuard(['director'])] },
      { path: 'patients/:id', component: PatientProfileComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
