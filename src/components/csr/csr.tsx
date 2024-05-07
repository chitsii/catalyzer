import dynamic from 'next/dynamic';

const CSR = dynamic(() => import('./csr-inner'), { ssr: false });

export default CSR;