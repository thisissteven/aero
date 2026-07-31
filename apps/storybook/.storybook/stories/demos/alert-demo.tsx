import React from 'react';

import { Alert, Button } from '@aero/ui';

export function AlertDemo() {
  return (
    <Alert className='w-[400px] items-center'>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>You have 2 credits left</Alert.Title>
        <Alert.Description>Get a paid plan for more credits</Alert.Description>
      </Alert.Content>
      <Button variant='tertiary'>Upgrade</Button>
    </Alert>
  );
}
