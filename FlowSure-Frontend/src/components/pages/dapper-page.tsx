'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ShieldOff, Wallet } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dapperApi } from '@/lib/api-client';
import { useWalletStore } from '@/store/wallet-store';
import { toast } from 'sonner';

interface NFT {
  id: string;
  name: string;
  collection: string;
  image: string;
  protected: boolean;
}

export function DapperPage() {
  const { user } = useWalletStore();
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);

  const { data: assetsData } = useQuery({
    queryKey: ['dapper-assets', user.addr],
    queryFn: () => dapperApi.getAssets(user.addr!),
    enabled: !!user.addr,
  });

  const { data: historyData } = useQuery({
    queryKey: ['dapper-history', user.addr],
    queryFn: () => dapperApi.getHistory(user.addr!),
    enabled: !!user.addr,
  });

  const insureMutation = useMutation({
    mutationFn: (nftId: string) => dapperApi.insure(user.addr!, nftId),
    onSuccess: () => {
      toast.success('NFT protection activated!');
    },
    onError: () => {
      toast.error('Failed to activate protection');
    },
  });

  // Use real data from API or fallback to demo data
  const nfts = assetsData?.data?.assets || [];
  const history = historyData?.data?.protectedAssets || [];

  const toggleProtection = (nftId: string) => {
    insureMutation.mutate(nftId);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dapper Protection</h1>
          <p className="text-muted-foreground">Protect your valuable Dapper NFTs from failed transactions</p>
        </div>

        {!user.loggedIn ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">Connect your Dapper wallet to view and protect your NFTs</p>
              <Button>Connect Dapper Wallet</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total NFTs</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{nfts.length}</div>
                  <p className="text-xs text-muted-foreground">In your wallet</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Protected</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {nfts.filter((nft: NFT) => nft.protected).length}
                  </div>
                  <p className="text-xs text-muted-foreground">NFTs protected</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unprotected</CardTitle>
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {nfts.filter((nft: NFT) => !nft.protected).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need protection</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Your NFTs</CardTitle>
                <CardDescription>Manage protection for your Dapper NFTs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {nfts.map((nft: NFT) => (
                    <Card key={nft.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage src={nft.image} alt={nft.name} />
                          <AvatarFallback>{nft.name[0]}</AvatarFallback>
                        </Avatar>
                        {nft.protected && (
                          <Badge className="absolute top-2 right-2" variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            Protected
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{nft.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{nft.collection}</p>
                        <Button
                          className="w-full"
                          variant={nft.protected ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => toggleProtection(nft.id)}
                          disabled={insureMutation.isPending}
                        >
                          {nft.protected ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Protection
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Protect NFT
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Protection History</CardTitle>
                <CardDescription>Recent protection activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.length > 0 ? history.map((entry: any) => (
                    <div key={entry.assetId} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{entry.assetId}</p>
                        <p className="text-sm text-muted-foreground">{new Date(entry.protectedAt * 1000).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{entry.assetType}</p>
                        <Badge variant="default">{entry.status}</Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-4">No protection history yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
