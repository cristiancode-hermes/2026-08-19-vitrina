import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as { userId: number; role: string };
});

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Solo personal del museo');
    }
    return true;
  }
}
