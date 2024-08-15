import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class WebSocketPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const client = context.switchToWs().getClient();
    const { user, roles } = client.handshake.user || {};
    const requiredRoles = this.reflector.get<string[][]>(
      'roles',
      context.getHandler(),
    ) || [[]];

    if (requiredRoles.length === 0) return true;

    for (const rolesSet of requiredRoles) {
      if (rolesSet.every((role: string) => roles?.includes(role))) return true;
    }

    return false;
  }
}
