import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { UiFeedbackService } from './ui-feedback.service';

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const feedbackInterceptor: HttpInterceptorFn = (req, next) => {
  const feedback = inject(UiFeedbackService);
  const isMutation = mutationMethods.has(req.method);
  const isAuthRequest =
    req.url.includes('/auth/login') || req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

  feedback.begin(isMutation);

  return next(req).pipe(
    tap(() => {
      if (isMutation && !isAuthRequest) {
        feedback.success(successTitle(req.method, req.url));
      }
    }),
    catchError((error) => {
      if (error instanceof HttpErrorResponse && !isAuthRequest) {
        feedback.error(errorTitle(error), errorDetail(error));
      }

      return throwError(() => error);
    }),
    finalize(() => feedback.end(isMutation))
  );
};

function successTitle(method: string, url: string) {
  if (url.includes('/payments')) return 'Payment recorded';
  if (url.includes('/triage')) return 'Triage saved';
  if (url.includes('/vitals')) return 'Vitals recorded';
  if (url.includes('/notes')) return 'Note saved';
  if (url.includes('/soap')) return 'Consultation note saved';
  if (url.includes('/prescriptions')) return 'Prescription sent';
  if (url.includes('/lab-requests')) return 'Lab request sent';
  if (url.includes('/imaging-requests')) return 'Imaging request sent';
  if (url.includes('/dispense')) return 'Medication dispensed';
  if (url.includes('/sample')) return 'Sample collected';
  if (url.includes('/results')) return 'Results saved';
  if (url.includes('/validate')) return 'Result validated';
  if (url.includes('/authorize')) return 'Result authorized';
  if (url.includes('/procedure')) return 'Procedure updated';
  if (url.includes('/report')) return 'Report released';
  if (url.includes('/invoices')) return 'Invoice saved';
  if (url.includes('/patients') && method === 'POST') return 'Patient registered';
  if (url.includes('/visits') && method === 'POST') return 'Visit created';
  return method === 'DELETE' ? 'Record deleted' : 'Changes saved';
}

function errorTitle(error: HttpErrorResponse) {
  if (error.status === 0) return 'Connection problem';
  if (error.status === 401) return 'Session expired';
  if (error.status === 403) return 'Access denied';
  if (error.status === 404) return 'Record not found';
  if (error.status === 422) return 'Check the form';
  return 'Action failed';
}

function errorDetail(error: HttpErrorResponse) {
  return error.error?.error?.message || error.message || 'Please try again.';
}
