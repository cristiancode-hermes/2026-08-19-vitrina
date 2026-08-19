import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(80)
  password: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Username or email' })
  @IsString()
  @MinLength(1)
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
