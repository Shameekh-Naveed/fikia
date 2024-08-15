import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    // const [req] = context.getArgs();
    const { user, roles } = request.user || {};
    const requiredRoles = this.reflector.get('roles', context.getHandler()) || [
      [],
    ];
    // Compare required roles array with user's roles array
    if (requiredRoles.length === 0) return true;
    for (const rolesSet of requiredRoles) {
      if (rolesSet.every((role: string) => roles?.includes(role))) return true;
    }
    return false;
  }
}
