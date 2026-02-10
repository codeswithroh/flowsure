'use client';

import { useState, useEffect } from 'react';
import { useNBATopShot, NBAMoment } from '@/hooks/useNBATopShot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, ShieldCheck, TrendingUp, Search, Filter, DollarSign } from 'lucide-react';

interface NBAMomentsGalleryProps {
  userAddress?: string;
}

export function NBAMomentsGallery({ userAddress }: NBAMomentsGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtected, setFilterProtected] = useState<boolean | undefined>(undefined);
  const [selectedMoment, setSelectedMoment] = useState<NBAMoment | null>(null);

  const {
    moments,
    loading,
    error,
    fetchProtectedMoments,
    filterMoments,
    getHighValueMoments,
    getTotalPortfolioValue,
    getProtectionCoverage
  } = useNBATopShot();

  useEffect(() => {
    if (userAddress) {
      fetchProtectedMoments(userAddress);
    }
  }, [userAddress]);

  const filteredMoments = filterMoments({
    player: searchQuery,
    isProtected: filterProtected
  });

  const highValueMoments = getHighValueMoments();
  const totalValue = getTotalPortfolioValue();
  const protectionCoverage = getProtectionCoverage();

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRarityBadge = (serialNumber: number) => {
    if (serialNumber <= 10) return { label: 'Legendary', color: 'bg-purple-500' };
    if (serialNumber <= 100) return { label: 'Rare', color: 'bg-blue-500' };
    if (serialNumber <= 1000) return { label: 'Uncommon', color: 'bg-green-500' };
    return { label: 'Common', color: 'bg-gray-500' };
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Portfolio Value</CardDescription>
            <CardTitle className="text-3xl">${totalValue.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>{moments.length} moments</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Protection Coverage</CardDescription>
            <CardTitle className="text-3xl">{protectionCoverage.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck className="h-4 w-4" />
              <span>{moments.filter(m => m.isProtected).length} protected</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>High-Value Moments</CardDescription>
            <CardTitle className="text-3xl">{highValueMoments.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              <span>Recommended for protection</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your NBA Top Shot Moments</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={filterProtected === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProtected(undefined)}
              >
                All
              </Button>
              <Button
                variant={filterProtected === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProtected(true)}
              >
                Protected
              </Button>
              <Button
                variant={filterProtected === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterProtected(false)}
              >
                Unprotected
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredMoments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No moments found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMoments.map((moment) => {
                  const rarity = getRarityBadge(moment.serialNumber);
                  
                  return (
                    <Card
                      key={moment.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedMoment(moment)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {moment.player.name}
                            </CardTitle>
                            <CardDescription>
                              {moment.player.team} • {moment.play.category}
                            </CardDescription>
                          </div>
                          {moment.isProtected && (
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Set and Serial */}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {moment.set.name}
                          </Badge>
                          <Badge className={`${rarity.color} text-white text-xs`}>
                            #{moment.serialNumber}
                          </Badge>
                        </div>

                        {/* Value */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Estimated Value</span>
                          <span className="font-bold text-lg">
                            ${(moment.value || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Protection Status */}
                        {moment.protection && (
                          <div className={`p-2 rounded-lg border ${getPriorityColor(moment.protection.priority)}`}>
                            <div className="flex items-center gap-2 text-xs font-medium mb-1">
                              <Shield className="h-3 w-3" />
                              {moment.protection.recommended ? 'Protection Recommended' : 'Low Risk'}
                            </div>
                            <div className="text-xs opacity-75">
                              {moment.protection.reason}
                            </div>
                            {moment.protection.recommended && !moment.isProtected && (
                              <div className="mt-2 text-xs">
                                <div className="flex justify-between">
                                  <span>Coverage:</span>
                                  <span className="font-medium">
                                    ${moment.protection.suggestedCoverage.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Fee:</span>
                                  <span className="font-medium">
                                    ${moment.protection.suggestedFee.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        {moment.protection?.recommended && !moment.isProtected && (
                          <Button size="sm" className="w-full">
                            <Shield className="h-4 w-4 mr-2" />
                            Protect This Moment
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Moment Details Modal (simplified) */}
      {selectedMoment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedMoment.player.name}</CardTitle>
                  <CardDescription>
                    {selectedMoment.player.team} • {selectedMoment.player.position}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMoment(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Set</p>
                  <p className="font-medium">{selectedMoment.set.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Serial Number</p>
                  <p className="font-medium">#{selectedMoment.serialNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Play Category</p>
                  <p className="font-medium">{selectedMoment.play.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{selectedMoment.play.date}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-sm">{selectedMoment.play.description || 'No description available'}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Estimated Value</span>
                  <span className="text-2xl font-bold">${(selectedMoment.value || 0).toFixed(2)}</span>
                </div>
                {selectedMoment.isListed && (
                  <Badge variant="outline">Listed for Sale</Badge>
                )}
              </div>

              {selectedMoment.protection?.recommended && !selectedMoment.isProtected && (
                <Button className="w-full" size="lg">
                  <Shield className="h-5 w-5 mr-2" />
                  Protect for ${selectedMoment.protection.suggestedFee.toFixed(2)}/month
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
