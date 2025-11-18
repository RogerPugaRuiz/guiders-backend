export class UpdateUserAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly file: Express.Multer.File,
    public readonly requesterId: string, // ID del usuario que hace la solicitud
  ) {}
}
