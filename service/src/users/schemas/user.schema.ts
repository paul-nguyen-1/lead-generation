import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

export interface ContractorPermissions {
  leadsAccess: boolean;
  draftEmailAccess: boolean;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Role, default: Role.Contractor })
  role: Role;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, default: null })
  refreshTokenHash: string | null;

  @Prop({
    type: {
      leadsAccess: { type: Boolean, default: false },
      draftEmailAccess: { type: Boolean, default: false },
    },
    default: () => ({ leadsAccess: false, draftEmailAccess: false }),
  })
  permissions: ContractorPermissions;
}

export const UserSchema = SchemaFactory.createForClass(User);
