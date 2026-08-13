package ibc_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	sdk "github.com/cosmos/cosmos-sdk/types"
	transfertypes "github.com/cosmos/ibc-go/v10/modules/apps/transfer/types"
)

func TestPFMEscrowAccountsUseEachHopsChannel(t *testing.T) {
	prefixes := [3]string{"juno-a", "juno-b", "juno-c"}
	hops := [3]pfmHop{
		{portID: "transfer", channelID: "channel-0"},
		{portID: "transfer", channelID: "channel-7"},
		{portID: "transfer", channelID: "channel-42"},
	}

	accounts := pfmEscrowAccounts(prefixes, hops)

	for i, hop := range hops {
		expected := sdk.MustBech32ifyAddressBytes(
			prefixes[i],
			transfertypes.GetEscrowAddress(hop.portID, hop.channelID),
		)
		require.Equal(t, expected, accounts[i], "hop %d must use its own channel ID", i+1)
	}
}
