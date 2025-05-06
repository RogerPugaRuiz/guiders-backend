const validateTrackingVisitorCurrentURL = (value: string): boolean => {
  const urlRegex =
    /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
  return urlRegex.test(value);
};

import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

export class TrackingVisitorCurrentURL extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      validateTrackingVisitorCurrentURL,
      'TrackingVisitorCurrentURL must be a valid URL',
    );
  }
}
