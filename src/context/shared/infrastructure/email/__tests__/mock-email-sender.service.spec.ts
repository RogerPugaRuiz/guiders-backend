import { Test, TestingModule } from '@nestjs/testing';
import { MockEmailSenderService } from '../mock-email-sender.service';

describe('MockEmailSenderService', () => {
  let service: MockEmailSenderService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockEmailSenderService],
    }).compile();

    service = module.get<MockEmailSenderService>(MockEmailSenderService);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sendEmail', () => {
    it('should send email successfully and log parameters', async () => {
      // Arrange
      const emailParams = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test HTML Content</h1>',
      };

      // Act
      await service.sendEmail(emailParams);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('[MOCK EMAIL]', emailParams);
    });

    it('should handle different email content', async () => {
      // Arrange
      const emailParams = {
        to: 'user@domain.com',
        subject: 'Different Subject',
        html: '<p>Different content with <strong>bold</strong> text</p>',
      };

      // Act
      await service.sendEmail(emailParams);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('[MOCK EMAIL]', emailParams);
    });

    it('should resolve without throwing errors', async () => {
      // Arrange
      const emailParams = {
        to: 'another@test.com',
        subject: 'Another Test',
        html: '<div>Complex HTML content</div>',
      };

      // Act & Assert
      await expect(service.sendEmail(emailParams)).resolves.toBeUndefined();
    });

    it('should handle empty subject and content', async () => {
      // Arrange
      const emailParams = {
        to: 'empty@test.com',
        subject: '',
        html: '',
      };

      // Act
      await service.sendEmail(emailParams);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('[MOCK EMAIL]', emailParams);
    });

    it('should handle special characters in email content', async () => {
      // Arrange
      const emailParams = {
        to: 'special@test.com',
        subject: 'Subject with émojis 🚀 and spéciål characters',
        html: '<p>Content with émojis 🎉 and spéciål characters & symbols</p>',
      };

      // Act
      await service.sendEmail(emailParams);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('[MOCK EMAIL]', emailParams);
    });
  });
});
