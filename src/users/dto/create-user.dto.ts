import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsNotEmpty } from "class-validator"

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    @MinLength(4)
    @MaxLength(30)
    @IsNotEmpty()
    nickname: string

    @ApiProperty()
    @IsString()
    @MinLength(4)
    @MaxLength(30)
    @IsNotEmpty()
    login: string

    @ApiProperty()
    @IsString()
    @MinLength(6)
    @MaxLength(50)
    @IsNotEmpty()
    password: string
}