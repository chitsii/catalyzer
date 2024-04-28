'use client'

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';


const Greet = () => {
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    invoke<string>('greet', { name: 'Next.js' })
      .then((response) => { setMessage(response); })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1>{message}</h1>
    </div>
  );
}

export { Greet }