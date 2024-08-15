import { JwtPayload } from './jwt-payload';

export interface ExtendedRequest extends Request {
  user: JwtPayload;
}
