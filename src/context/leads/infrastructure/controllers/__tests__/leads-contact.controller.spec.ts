import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { LeadsContactController } from '../leads-contact.controller';
import { UpdateContactDataDto } from '../../../application/dtos/update-contact-data.dto';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { VisitorNotFoundError } from '../../../domain/errors/leads.error';

describe('LeadsContactController - updateContactDataByVisitorId', () => {
  let controller: LeadsContactController;
  let commandBusMock: jest.Mocked<CommandBus>;

  const mockRequest = {
    user: {
      sub: 'user-123',
      roles: ['commercial'],
      companyId: 'company-123',
    },
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    commandBusMock = {
      execute: jest.fn(),
    } as any;

    controller = new LeadsContactController(commandBusMock, {} as any);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/leads/contact-data/:visitorId', () => {
    const visitorId = Uuid.random().value;
    const contactDataId = Uuid.random().value;

    it('debe retornar status 201 si se crea un nuevo lead', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
        apellidos: 'Puga Ruiz',
        email: 'rogerpugaruiz@gmail.com',
        telefono: '+34609252646',
        poblacion: 'MOLINS DE REI',
      };

      commandBusMock.execute.mockResolvedValue(
        ok({
          id: contactDataId,
          isNew: true,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 201,
        message: 'Datos de contacto creados',
      });
    });

    it('debe retornar status 200 si se actualiza un lead existente', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
        email: 'rogerpugaruiz@gmail.com',
      };

      commandBusMock.execute.mockResolvedValue(
        ok({
          id: contactDataId,
          isNew: false,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Datos de contacto actualizados',
      });
    });

    it('debe lanzar NotFoundException si el visitor no existe', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
      };

      commandBusMock.execute.mockResolvedValue(
        err(new VisitorNotFoundError(visitorId)),
      );

      try {
        await controller.updateContactDataByVisitorId(
          visitorId,
          dto,
          mockRequest as any,
          mockResponse as any,
        );
        fail('Debería haber lanzado NotFoundException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('no existe');
      }
    });

    it('debe lanzar BadRequestException si hay un error en el comando', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
      };

      commandBusMock.execute.mockResolvedValue(
        err({ message: 'Error en persistencia' } as any),
      );

      try {
        await controller.updateContactDataByVisitorId(
          visitorId,
          dto,
          mockRequest as any,
          mockResponse as any,
        );
        fail('Debería haber lanzado BadRequestException');
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('debe permitir actualizar con solo algunos campos', async () => {
      const dto: UpdateContactDataDto = {
        email: 'nuevo@example.com',
      };

      commandBusMock.execute.mockResolvedValue(
        ok({
          id: contactDataId,
          isNew: false,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      const command = commandBusMock.execute.mock.calls[0][0] as any;
      expect(command.input.email).toBe('nuevo@example.com');
      expect(command.input.nombre).toBeUndefined();
    });

    it('debe obtener el companyId del request.user', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
      };

      commandBusMock.execute.mockResolvedValue(
        ok({
          id: contactDataId,
          isNew: true,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );

      const command = commandBusMock.execute.mock.calls[0][0] as any;
      expect(command.input.companyId).toBe('company-123');
    });

    it('debe pasar correctamente todos los parámetros al comando', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
        apellidos: 'Puga Ruiz',
        email: 'roger@example.com',
        telefono: '+34609252646',
        poblacion: 'MOLINS DE REI',
      };

      commandBusMock.execute.mockResolvedValue(
        ok({
          id: contactDataId,
          isNew: true,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );

      const command = commandBusMock.execute.mock.calls[0][0] as any;
      expect(command.input.visitorId).toBe(visitorId);
      expect(command.input.companyId).toBe('company-123');
      expect(command.input.nombre).toBe('Roger');
      expect(command.input.apellidos).toBe('Puga Ruiz');
      expect(command.input.email).toBe('roger@example.com');
      expect(command.input.telefono).toBe('+34609252646');
      expect(command.input.poblacion).toBe('MOLINS DE REI');
    });

    it('debe retornar status 201 solo cuando isNew=true', async () => {
      const dto: UpdateContactDataDto = {
        nombre: 'Roger',
      };

      // Primer caso: CREATE
      commandBusMock.execute.mockResolvedValueOnce(
        ok({
          id: contactDataId,
          isNew: true,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);

      // Limpiar mocks
      jest.clearAllMocks();

      // Segundo caso: UPDATE
      commandBusMock.execute.mockResolvedValueOnce(
        ok({
          id: contactDataId,
          isNew: false,
        }),
      );

      await controller.updateContactDataByVisitorId(
        visitorId,
        dto,
        mockRequest as any,
        mockResponse as any,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
