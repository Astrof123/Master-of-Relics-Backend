import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsNotEmpty } from "class-validator"

export class LoginDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    login: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string
}